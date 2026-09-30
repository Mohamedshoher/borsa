import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDatabase } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { applyFundValuation, refreshPortfolios, round2 } from '@/lib/financial';
import { recordAuditLog } from '@/lib/audit';

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

// POST: record profit/loss for the WHOLE fund. It is shared by every partner in proportion to
// their units, and applies only to the money that is working (idle cash is not affected).
// Send either `new_invested_value` (current market value of the working money)
// or `change_percentage` (e.g. 5 or -6).
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المدير مطلوبة لتحديث تقييم المحفظة' }, { status: 403 });
    }

    const body = await req.json();
    const { new_invested_value, change_percentage, valuation_date, valuation_time, reason, notes } = body;

    const db = getDb();
    const previousInvested = db.fund.invested_value;

    let target: number;
    if (new_invested_value !== undefined && new_invested_value !== '') {
      target = parseFloat(new_invested_value);
    } else if (change_percentage !== undefined && change_percentage !== '') {
      target = round2(previousInvested * (1 + parseFloat(change_percentage) / 100));
    } else {
      return NextResponse.json({ error: 'أدخل القيمة الجديدة للأموال المستثمرة أو نسبة التغير' }, { status: 400 });
    }
    if (isNaN(target) || target < 0) {
      return NextResponse.json({ error: 'يرجى إدخال قيمة صحيحة' }, { status: 400 });
    }

    const now = new Date();
    const dateStr = valuation_date || now.toISOString().split('T')[0];
    const timeStr = valuation_time || now.toTimeString().split(' ')[0].substring(0, 5);

    let result;
    try {
      result = applyFundValuation(db, target, { date: dateStr, time: timeStr, reason, notes, user });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    refreshPortfolios(db);
    saveDatabase(db);

    recordAuditLog(
      user,
      'UPDATE',
      'fund',
      result.batchId,
      { invested_value: previousInvested },
      { invested_value: target, change_amount: result.changeAmount, change_percentage: result.changePercentage }
    );

    const isProfit = result.changeAmount > 0;
    const stamp = new Date().toISOString();
    for (const partner of db.partners) {
      const pf = db.portfolios.find((p) => p.partner_id === partner.id);
      if (partner.is_manager || !pf || (pf.units || 0) <= 0) continue;
      const share = db.portfolio_valuations.find((v) => v.batch_id === result.batchId && v.partner_id === partner.id);
      db.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: partner.user_id || 'system',
        partner_id: partner.id,
        title: isProfit ? 'تم تسجيل أرباح جديدة في المحفظة' : 'تم تحديث تقييم المحفظة',
        message: `تغيّرت الأموال العاملة بنسبة ${result.changePercentage}%. نصيبك: ${share && share.change_amount > 0 ? '+' : ''}${share?.change_amount ?? 0} ج.م، وقيمة حصتك الآن ${pf.current_valuation} ج.م.`,
        type: isProfit ? 'SUCCESS' : 'WARNING',
        is_read: 0,
        created_at: stamp,
      });
    }
    saveDatabase(db);

    return NextResponse.json({
      success: true,
      message: `تم توزيع ${isProfit ? 'الأرباح' : 'الخسائر'} (${result.changePercentage}% على الأموال العاملة) على جميع الشركاء بنسبة حصصهم`,
      change_amount: result.changeAmount,
      change_percentage: result.changePercentage,
      fund: db.fund,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
