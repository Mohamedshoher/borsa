import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDatabase } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { recordTransaction, recalculatePortfolio } from '@/lib/financial';
import { recordAuditLog } from '@/lib/audit';
import { Withdrawal } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const db = getDb();
    let withdrawals = [...db.withdrawals];

    if (user.role === 'partner') {
      withdrawals = withdrawals.filter((w) => w.partner_id === user.partner_id);
    }

    const enriched = withdrawals.map((w) => {
      const partner = db.partners.find((p) => p.id === w.partner_id);
      return {
        ...w,
        partner_name: partner?.full_name || 'غير معروف',
      };
    });

    enriched.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return NextResponse.json({ withdrawals: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المدير مطلوبة لتسجيل سحب' }, { status: 403 });
    }

    const body = await req.json();
    const { partner_id, amount, withdrawal_date, withdrawal_time, payment_method, reference_no, notes, request_id } = body;

    if (!partner_id || !amount || !payment_method) {
      return NextResponse.json({ error: 'الشريك والمبلغ وطريقة الدفع حقول إلزامية' }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'مبلغ السحب يجب أن يكون أكبر من الصفر' }, { status: 400 });
    }

    const db = getDb();
    const partner = db.partners.find((p) => p.id === partner_id);
    const portfolio = db.portfolios.find((pf) => pf.partner_id === partner_id);

    if (!partner || !portfolio) {
      return NextResponse.json({ error: 'الشريك أو المحفظة غير موجودة' }, { status: 404 });
    }

    // Check available balance
    if (numAmount > portfolio.net_value) {
      return NextResponse.json({
        error: `المبلغ المطلوب سحبه (${numAmount} ج.م) يتجاوز صافي القيمة المتاحة للسحب (${portfolio.net_value} ج.م)`,
      }, { status: 400 });
    }

    const dateStr = withdrawal_date || new Date().toISOString().split('T')[0];
    const timeStr = withdrawal_time || new Date().toTimeString().split(' ')[0].substring(0, 5);
    const now = new Date().toISOString();

    const balanceBefore = portfolio.current_valuation;
    const balanceAfter = Math.max(0, balanceBefore - numAmount);

    // 1. Record Transaction
    const txn = recordTransaction({
      partnerId: partner_id,
      portfolioId: portfolio.id,
      type: 'WITHDRAWAL',
      amount: -numAmount,
      date: dateStr,
      time: timeStr,
      balanceBefore,
      balanceAfter,
      createdById: user.id,
      paymentMethod: payment_method,
      referenceNo: reference_no,
      notes: notes || 'عملية سحب من المحفظة',
    });

    // 2. Record Withdrawal
    const wthId = `wth_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newWithdrawal: Withdrawal = {
      id: wthId,
      partner_id,
      portfolio_id: portfolio.id,
      transaction_id: txn.id,
      request_id: request_id || null,
      amount: numAmount,
      withdrawal_date: dateStr,
      withdrawal_time: timeStr,
      payment_method,
      reference_no: reference_no || null,
      notes: notes || null,
      created_by: user.id,
      created_at: now,
    };

    db.withdrawals.unshift(newWithdrawal);
    saveDatabase(db);

    // 3. Recalculate Portfolio
    const updatedPortfolio = recalculatePortfolio(partner_id);

    // 4. Audit Log
    recordAuditLog(
      user,
      'CREATE',
      'portfolio',
      wthId,
      null,
      { partner_name: partner.full_name, amount: numAmount, method: payment_method }
    );

    // 5. Partner Notification
    db.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: partner.user_id || 'system',
      partner_id: partner.id,
      title: 'تم تسجيل عملية سحب من محفظتك',
      message: `تم تنفيذ سحب بمبلغ ${numAmount} ج.م من حساب محفظتك بتاريخ ${dateStr}.`,
      type: 'WARNING',
      is_read: 0,
      created_at: now,
    });
    saveDatabase(db);

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل عملية السحب وتحديث رصيد المحفظة بنجاح',
      withdrawal: newWithdrawal,
      portfolio: updatedPortfolio,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
