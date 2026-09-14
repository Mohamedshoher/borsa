import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDatabase } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { recordTransaction, recalculatePortfolio } from '@/lib/financial';
import { recordAuditLog } from '@/lib/audit';
import { WithdrawalRequest, Withdrawal } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const db = getDb();
    let requests = [...db.withdrawal_requests];

    if (user.role === 'partner') {
      requests = requests.filter((r) => r.partner_id === user.partner_id);
    }

    const enriched = requests.map((r) => {
      const partner = db.partners.find((p) => p.id === r.partner_id);
      const portfolio = db.portfolios.find((pf) => pf.partner_id === r.partner_id);
      const reviewer = db.users.find((u) => u.id === r.reviewed_by);
      return {
        ...r,
        partner_name: partner?.full_name || 'غير معروف',
        partner_phone: partner?.phone || '',
        current_valuation: portfolio?.current_valuation || 0,
        reviewed_by_name: reviewer?.full_name || null,
      };
    });

    enriched.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return NextResponse.json({ withdrawal_requests: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Partner creates a withdrawal request
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const partnerId = user.role === 'partner' ? user.partner_id : (await req.clone().json()).partner_id;
    if (!partnerId) {
      return NextResponse.json({ error: 'معرف الشريك غير محدد' }, { status: 400 });
    }

    const body = await req.json();
    const { amount, reason, notes } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'يرجى إدخال مبلغ صحيح للسحب' }, { status: 400 });
    }

    const db = getDb();
    const partner = db.partners.find((p) => p.id === partnerId);
    const portfolio = db.portfolios.find((pf) => pf.partner_id === partnerId);

    if (!partner || !portfolio) {
      return NextResponse.json({ error: 'بيانات المحفظة غير موجودة' }, { status: 404 });
    }

    if (numAmount > portfolio.net_value) {
      return NextResponse.json({
        error: `المبلغ المطلوب (${numAmount} ج.م) يتجاوز صافي رصيدك المتاح (${portfolio.net_value} ج.م)`,
      }, { status: 400 });
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
    const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newRequest: WithdrawalRequest = {
      id: reqId,
      partner_id: partnerId,
      amount: numAmount,
      request_date: dateStr,
      request_time: timeStr,
      reason: reason?.trim() || null,
      notes: notes?.trim() || null,
      status: 'pending',
      admin_notes: null,
      approved_amount: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: now.toISOString(),
    };

    db.withdrawal_requests.unshift(newRequest);

    // Notify Admins
    const adminUsers = db.users.filter((u) => u.role === 'admin');
    for (const admin of adminUsers) {
      db.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: admin.id,
        partner_id: partnerId,
        title: 'طلب سحب جديد من شريك',
        message: `قدم الشريك (${partner.full_name}) طلب سحب بمبلغ (${numAmount} ج.م) وبانتظار المراجعة.`,
        type: 'WARNING',
        is_read: 0,
        created_at: now.toISOString(),
      });
    }

    saveDatabase(db);

    recordAuditLog(
      user,
      'CREATE',
      'withdrawal_request',
      reqId,
      null,
      { partner_name: partner.full_name, amount: numAmount, reason }
    );

    return NextResponse.json({
      success: true,
      message: 'تم إرسال طلب السحب بنجاح وهو الآن قيد مراجعة مدير الاستثمار',
      withdrawal_request: newRequest,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Admin reviews (Approves / Rejects) withdrawal request
export async function PUT(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المدير مطلوبة لمراجعة طلبات السحب' }, { status: 403 });
    }

    const body = await req.json();
    const { request_id, action, approved_amount, admin_notes, payment_method, reference_no } = body;

    if (!request_id || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'معرف الطلب والإجراء (approve/reject) مطلوبان' }, { status: 400 });
    }

    const db = getDb();
    const reqIndex = db.withdrawal_requests.findIndex((r) => r.id === request_id);
    if (reqIndex === -1) {
      return NextResponse.json({ error: 'طلب السحب غير موجود' }, { status: 404 });
    }

    const request = db.withdrawal_requests[reqIndex];
    if (request.status !== 'pending') {
      return NextResponse.json({ error: 'تمت معالجة هذا الطلب مسبقاً' }, { status: 400 });
    }

    const partner = db.partners.find((p) => p.id === request.partner_id);
    const portfolio = db.portfolios.find((pf) => pf.partner_id === request.partner_id);
    if (!partner || !portfolio) {
      return NextResponse.json({ error: 'بيانات الشريك أو المحفظة غير موجودة' }, { status: 404 });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const dateStr = nowIso.split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    if (action === 'reject') {
      db.withdrawal_requests[reqIndex].status = 'rejected';
      db.withdrawal_requests[reqIndex].admin_notes = admin_notes || 'تم رفض الطلب';
      db.withdrawal_requests[reqIndex].reviewed_by = user.id;
      db.withdrawal_requests[reqIndex].reviewed_at = nowIso;

      // Notify Partner
      db.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: partner.user_id || 'system',
        partner_id: partner.id,
        title: 'تم رفض طلب السحب',
        message: `تم رفض طلب السحب بمبلغ ${request.amount} ج.م. سبب الرفض: ${admin_notes || 'لم يحدد'}`,
        type: 'ALERT',
        is_read: 0,
        created_at: nowIso,
      });

      saveDatabase(db);

      recordAuditLog(
        user,
        'REJECT',
        'withdrawal_request',
        request.id,
        request,
        { status: 'rejected', admin_notes }
      );

      return NextResponse.json({
        success: true,
        message: 'تم رفض طلب السحب وإشعار الشريك بذلك',
        request: db.withdrawal_requests[reqIndex],
      });
    }

    // APPROVE
    const finalAmount = approved_amount ? parseFloat(approved_amount) : request.amount;
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return NextResponse.json({ error: 'المبلغ المعتمد يجب أن يكون أكبر من الصفر' }, { status: 400 });
    }

    if (finalAmount > portfolio.net_value) {
      return NextResponse.json({
        error: `المبلغ المعتمد (${finalAmount} ج.م) يتجاوز صافي رصيد المحفظة المتاح (${portfolio.net_value} ج.م)`,
      }, { status: 400 });
    }

    db.withdrawal_requests[reqIndex].status = 'approved';
    db.withdrawal_requests[reqIndex].approved_amount = finalAmount;
    db.withdrawal_requests[reqIndex].admin_notes = admin_notes || 'تمت الموافقة وصرف المبلغ';
    db.withdrawal_requests[reqIndex].reviewed_by = user.id;
    db.withdrawal_requests[reqIndex].reviewed_at = nowIso;

    // Create Transaction
    const balanceBefore = portfolio.current_valuation;
    const balanceAfter = Math.max(0, balanceBefore - finalAmount);

    const txn = recordTransaction({
      partnerId: partner.id,
      portfolioId: portfolio.id,
      type: 'WITHDRAWAL',
      amount: -finalAmount,
      date: dateStr,
      time: timeStr,
      balanceBefore,
      balanceAfter,
      createdById: user.id,
      paymentMethod: payment_method || 'تحويل بنكي معتمد',
      referenceNo: reference_no,
      notes: `سحب معتمد لطلب رقم (${request.id}) - ${admin_notes || ''}`,
    });

    // Create Withdrawal Record
    const wthId = `wth_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newWithdrawal: Withdrawal = {
      id: wthId,
      partner_id: partner.id,
      portfolio_id: portfolio.id,
      transaction_id: txn.id,
      request_id: request.id,
      amount: finalAmount,
      withdrawal_date: dateStr,
      withdrawal_time: timeStr,
      payment_method: payment_method || 'تحويل بنكي معتمد',
      reference_no: reference_no || null,
      notes: `بناءً على طلب السحب المقدم بتاريخ ${request.request_date}`,
      created_by: user.id,
      created_at: nowIso,
    };
    db.withdrawals.unshift(newWithdrawal);
    saveDatabase(db);

    // Recalculate Portfolio
    const updatedPortfolio = recalculatePortfolio(partner.id);

    // Notify Partner
    db.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: partner.user_id || 'system',
      partner_id: partner.id,
      title: 'تمت الموافقة على طلب السحب وصرف المبلغ',
      message: `تمت الموافقة على طلب السحب وصرف مبلغ ${finalAmount} ج.م وتحويله لحسابكم.`,
      type: 'SUCCESS',
      is_read: 0,
      created_at: nowIso,
    });
    saveDatabase(db);

    recordAuditLog(
      user,
      'APPROVE',
      'withdrawal_request',
      request.id,
      request,
      { approved_amount: finalAmount, withdrawal_id: wthId }
    );

    return NextResponse.json({
      success: true,
      message: 'تمت الموافقة على طلب السحب وتنفيذ القيد المالي بنجاح',
      request: db.withdrawal_requests[reqIndex],
      withdrawal: newWithdrawal,
      portfolio: updatedPortfolio,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
