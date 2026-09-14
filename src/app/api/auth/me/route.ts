import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    // If partner, also fetch partner info
    let partner = null;
    if (user.partner_id) {
      const db = getDb();
      const p = db.partners.find((x) => x.id === user.partner_id);
      const pf = db.portfolios.find((x) => x.partner_id === user.partner_id);
      if (p) {
        partner = {
          ...p,
          current_valuation: pf?.current_valuation || 0,
          net_value: pf?.net_value || 0,
          initial_capital: pf?.initial_capital || 0,
        };
      }
    }

    return NextResponse.json({ authenticated: true, user, partner });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
