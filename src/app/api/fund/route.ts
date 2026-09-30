import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDatabase } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { allocateFund, getFundTotal, getManagerPartner, getNav, refreshPortfolios, round2 } from '@/lib/financial';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET: state of the shared fund + everyone's share of it
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const db = getDb();
    const total = getFundTotal(db);
    const manager = getManagerPartner(db);

    const fund = {
      ...db.fund,
      total_value: total,
      nav_per_unit: getNav(db),
      invested_pct: total > 0 ? round2((db.fund.invested_value / total) * 100) : 0,
      manager_partner_id: manager?.id || null,
    };

    // Partners only see their own share; the admin sees the full breakdown
    const holders = db.portfolios
      .filter((pf) => user.role === 'admin' || pf.partner_id === user.partner_id)
      .map((pf) => {
        const partner = db.partners.find((p) => p.id === pf.partner_id);
        return {
          partner_id: pf.partner_id,
          partner_name: partner?.full_name || 'غير معروف',
          is_manager: Boolean(partner?.is_manager),
          management_fee_rate: partner?.management_fee_rate ?? 0,
          units: pf.units || 0,
          ownership_pct: pf.ownership_pct || 0,
          current_valuation: pf.current_valuation,
          invested_value: pf.invested_value || 0,
          idle_value: pf.idle_value || 0,
        };
      })
      .sort((a, b) => b.units - a.units);

    return NextResponse.json({ fund, holders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: move money between the wallet (idle) and the market (invested)
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المدير مطلوبة' }, { status: 403 });
    }

    const { direction, amount } = await req.json();
    const numAmount = parseFloat(amount);
    if (!['INVEST', 'DIVEST'].includes(direction) || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'حدد الاتجاه ومبلغاً أكبر من الصفر' }, { status: 400 });
    }

    const db = getDb();
    const before = { ...db.fund };
    try {
      allocateFund(db, direction, numAmount);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    refreshPortfolios(db);
    saveDatabase(db);

    recordAuditLog(user, 'UPDATE', 'fund', null, before, { ...db.fund, direction, amount: numAmount });

    return NextResponse.json({
      success: true,
      message: direction === 'INVEST' ? `تم استثمار ${numAmount} ج.م من السيولة` : `تم سحب ${numAmount} ج.م من الاستثمار إلى السيولة`,
      fund: db.fund,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
