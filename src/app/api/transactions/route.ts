import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { recordTransaction, recalculatePortfolio } from '@/lib/financial';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const partnerIdParam = searchParams.get('partner_id');
    const typeParam = searchParams.get('type');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    const db = getDb();
    let txns = [...db.transactions];

    // Enforce partner isolation: partner can ONLY view their own transactions
    if (user.role === 'partner') {
      txns = txns.filter((t) => t.partner_id === user.partner_id);
    } else if (partnerIdParam && partnerIdParam !== 'ALL') {
      txns = txns.filter((t) => t.partner_id === partnerIdParam);
    }

    if (typeParam && typeParam !== 'ALL') {
      txns = txns.filter((t) => t.type === typeParam);
    }

    if (fromDate) {
      txns = txns.filter((t) => t.date >= fromDate);
    }

    if (toDate) {
      txns = txns.filter((t) => t.date <= toDate);
    }

    // Join partner name and creator name
    const enrichedTxns = txns.map((t) => {
      const partner = db.partners.find((p) => p.id === t.partner_id);
      const creator = db.users.find((u) => u.id === t.created_by_user_id);
      return {
        ...t,
        partner_name: partner?.full_name || 'غير معروف',
        created_by_name: creator?.full_name || 'النظام',
      };
    });

    // Sort descending by date, time, and creation
    enrichedTxns.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.time.localeCompare(a.time);
    });

    return NextResponse.json({ transactions: enrichedTxns });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Manual settlement or accounting adjustment (Admin only)
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المدير مطلوبة لتسجيل تسوية محاسبية' }, { status: 403 });
    }

    const body = await req.json();
    const { partner_id, amount, date, time, notes, payment_method, type = 'SETTLEMENT' } = body;

    if (!partner_id || amount === undefined || !notes) {
      return NextResponse.json({ error: 'الشريك والمبلغ وتوضيح سبب التسوية حقول إلزامية' }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount === 0) {
      return NextResponse.json({ error: 'يجب إدخال مبلغ صحيح للتسوية' }, { status: 400 });
    }

    const db = getDb();
    const partner = db.partners.find((p) => p.id === partner_id);
    const portfolio = db.portfolios.find((pf) => pf.partner_id === partner_id);

    if (!partner || !portfolio) {
      return NextResponse.json({ error: 'الشريك أو المحفظة غير موجودة' }, { status: 404 });
    }

    const dateStr = date || new Date().toISOString().split('T')[0];
    const timeStr = time || new Date().toTimeString().split(' ')[0].substring(0, 5);

    const balanceBefore = portfolio.current_valuation;
    const balanceAfter = Math.max(0, balanceBefore + numAmount);

    const txn = recordTransaction({
      partnerId: partner_id,
      portfolioId: portfolio.id,
      type: type || 'SETTLEMENT',
      amount: numAmount,
      date: dateStr,
      time: timeStr,
      balanceBefore,
      balanceAfter,
      createdById: user.id,
      paymentMethod: payment_method || 'تسوية محاسبية',
      notes,
    });

    recalculatePortfolio(partner_id);

    recordAuditLog(
      user,
      'CREATE',
      'transaction',
      txn.id,
      null,
      { partner_name: partner.full_name, amount: numAmount, notes }
    );

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل الحركة المحاسبية بنجاح',
      transaction: txn,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
