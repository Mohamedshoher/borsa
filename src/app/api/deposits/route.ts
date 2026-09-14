import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDatabase } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { recordTransaction, recalculatePortfolio } from '@/lib/financial';
import { recordAuditLog } from '@/lib/audit';
import { Deposit } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const db = getDb();
    let deposits = [...db.deposits];

    if (user.role === 'partner') {
      deposits = deposits.filter((d) => d.partner_id === user.partner_id);
    }

    const enriched = deposits.map((d) => {
      const partner = db.partners.find((p) => p.id === d.partner_id);
      return {
        ...d,
        partner_name: partner?.full_name || 'غير معروف',
      };
    });

    enriched.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return NextResponse.json({ deposits: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المدير مطلوبة لتسجيل إيداع' }, { status: 403 });
    }

    const body = await req.json();
    const { partner_id, amount, deposit_date, deposit_time, payment_method, reference_no, notes } = body;

    if (!partner_id || !amount || !payment_method) {
      return NextResponse.json({ error: 'الشريك والمبلغ وطريقة الدفع حقول إلزامية' }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'مبلغ الإيداع يجب أن يكون أكبر من الصفر' }, { status: 400 });
    }

    const db = getDb();
    const partner = db.partners.find((p) => p.id === partner_id);
    const portfolio = db.portfolios.find((pf) => pf.partner_id === partner_id);

    if (!partner || !portfolio) {
      return NextResponse.json({ error: 'الشريك أو المحفظة غير موجودة' }, { status: 404 });
    }

    const dateStr = deposit_date || new Date().toISOString().split('T')[0];
    const timeStr = deposit_time || new Date().toTimeString().split(' ')[0].substring(0, 5);
    const now = new Date().toISOString();

    const balanceBefore = portfolio.current_valuation;
    const balanceAfter = balanceBefore + numAmount;

    // 1. Record Transaction
    const txn = recordTransaction({
      partnerId: partner_id,
      portfolioId: portfolio.id,
      type: 'DEPOSIT',
      amount: numAmount,
      date: dateStr,
      time: timeStr,
      balanceBefore,
      balanceAfter,
      createdById: user.id,
      paymentMethod: payment_method,
      referenceNo: reference_no,
      notes: notes || 'إيداع إضافي في المحفظة',
    });

    // 2. Record Deposit
    const depId = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newDeposit: Deposit = {
      id: depId,
      partner_id,
      portfolio_id: portfolio.id,
      transaction_id: txn.id,
      amount: numAmount,
      deposit_date: dateStr,
      deposit_time: timeStr,
      payment_method,
      reference_no: reference_no || null,
      notes: notes || null,
      created_by: user.id,
      created_at: now,
    };

    db.deposits.unshift(newDeposit);
    saveDatabase(db);

    // 3. Recalculate Portfolio
    const updatedPortfolio = recalculatePortfolio(partner_id);

    // 4. Audit Log
    recordAuditLog(
      user,
      'CREATE',
      'portfolio',
      depId,
      null,
      { partner_name: partner.full_name, amount: numAmount, method: payment_method }
    );

    // 5. Partner Notification
    db.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: partner.user_id || 'system',
      partner_id: partner.id,
      title: 'تم تسجيل إيداع جديد في محفظتك',
      message: `تم قيد إيداع بمبلغ ${numAmount} ج.م في حساب محفظتك بنجاح بتاريخ ${dateStr}.`,
      type: 'SUCCESS',
      is_read: 0,
      created_at: now,
    });
    saveDatabase(db);

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل الإيداع وتحديث رصيد المحفظة بنجاح',
      deposit: newDeposit,
      portfolio: updatedPortfolio,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
