import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDatabase } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { recordTransaction, recalculatePortfolio } from '@/lib/financial';
import { recordAuditLog } from '@/lib/audit';
import { PortfolioValuation } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get('partner_id');

    const db = getDb();
    let valuations = [...db.portfolio_valuations];

    if (user.role === 'partner') {
      valuations = valuations.filter((v) => v.partner_id === user.partner_id);
    } else if (partnerId && partnerId !== 'ALL') {
      valuations = valuations.filter((v) => v.partner_id === partnerId);
    }

    const enriched = valuations.map((v) => {
      const partner = db.partners.find((p) => p.id === v.partner_id);
      const creator = db.users.find((u) => u.id === v.created_by);
      return {
        ...v,
        partner_name: partner?.full_name || 'غير معروف',
        created_by_name: creator?.full_name || 'المدير',
      };
    });

    enriched.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return NextResponse.json({ valuations: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المدير مطلوبة لتحديث تقييم المحافظ' }, { status: 403 });
    }

    const body = await req.json();
    const { partner_id, new_valuation, valuation_date, valuation_time, reason, notes } = body;

    if (!partner_id || new_valuation === undefined) {
      return NextResponse.json({ error: 'معرف الشريك والقيمة الجديدة مطلوبان' }, { status: 400 });
    }

    const parsedValuation = parseFloat(new_valuation);
    if (isNaN(parsedValuation) || parsedValuation < 0) {
      return NextResponse.json({ error: 'يرجى إدخال قيمة صحيحة للمحفظة' }, { status: 400 });
    }

    const db = getDb();
    const partner = db.partners.find((p) => p.id === partner_id);
    const portfolio = db.portfolios.find((pf) => pf.partner_id === partner_id);

    if (!partner || !portfolio) {
      return NextResponse.json({ error: 'الشريك أو المحفظة غير موجودة' }, { status: 404 });
    }

    const previousValuation = portfolio.current_valuation;
    const changeAmount = Math.round((parsedValuation - previousValuation) * 100) / 100;

    if (changeAmount === 0) {
      return NextResponse.json({ error: 'القيمة الجديدة مطابقة للقيمة الحالية تماماً، لا يوجد تغير لتسجيله' }, { status: 400 });
    }

    const changePercentage = previousValuation > 0
      ? Math.round((changeAmount / previousValuation) * 10000) / 100
      : 0;

    const valuationType: 'PROFIT' | 'LOSS' = changeAmount > 0 ? 'PROFIT' : 'LOSS';
    const txnType = valuationType; // 'PROFIT' or 'LOSS'

    const dateStr = valuation_date || new Date().toISOString().split('T')[0];
    const timeStr = valuation_time || new Date().toTimeString().split(' ')[0].substring(0, 5);
    const now = new Date().toISOString();

    // 1. Record Transaction in Master Ledger
    const txn = recordTransaction({
      partnerId: partner_id,
      portfolioId: portfolio.id,
      type: txnType,
      amount: changeAmount, // positive for profit, negative for loss
      date: dateStr,
      time: timeStr,
      balanceBefore: previousValuation,
      balanceAfter: parsedValuation,
      createdById: user.id,
      paymentMethod: valuationType === 'PROFIT' ? 'أرباح استثمار وتداول' : 'خسائر استثمار وتداول',
      notes: notes || `تحديث تقييم المحفظة: ${reason || (valuationType === 'PROFIT' ? 'أرباح محققة' : 'خسائر سوقية')}`,
    });

    // 2. Record Portfolio Valuation History
    const valId = `val_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRecord: PortfolioValuation = {
      id: valId,
      partner_id,
      portfolio_id: portfolio.id,
      transaction_id: txn.id,
      previous_valuation: previousValuation,
      new_valuation: parsedValuation,
      change_amount: changeAmount,
      change_percentage: changePercentage,
      valuation_date: dateStr,
      valuation_time: timeStr,
      valuation_type: valuationType,
      reason: reason || (valuationType === 'PROFIT' ? 'أرباح تداول دورية' : 'تراجع في التقييم السوقي'),
      notes: notes || null,
      created_by: user.id,
      created_at: now,
    };

    db.portfolio_valuations.unshift(newRecord);
    saveDatabase(db);

    // 3. Recalculate Portfolio
    const updatedPortfolio = recalculatePortfolio(partner_id);

    // 4. Audit Log
    recordAuditLog(
      user,
      'UPDATE',
      'portfolio',
      valId,
      { previous_valuation: previousValuation },
      { new_valuation: parsedValuation, change_amount: changeAmount, change_percentage: changePercentage }
    );

    // 5. Partner Notification
    db.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: partner.user_id || 'system',
      partner_id: partner.id,
      title: valuationType === 'PROFIT' ? 'تم تسجيل أرباح جديدة في محفظتك' : 'تم تحديث تقييم محفظتك',
      message: `تم تحديث قيمة محفظتك إلى ${parsedValuation} ج.م (${changeAmount > 0 ? '+' : ''}${changeAmount} ج.م | ${changePercentage}%) بتاريخ ${dateStr}.`,
      type: valuationType === 'PROFIT' ? 'SUCCESS' : 'WARNING',
      is_read: 0,
      created_at: now,
    });
    saveDatabase(db);

    return NextResponse.json({
      success: true,
      message: `تم تحديث قيمة المحفظة وتسجيل ${valuationType === 'PROFIT' ? 'الأرباح' : 'الخسائر'} بنجاح`,
      valuation: newRecord,
      portfolio: updatedPortfolio,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
