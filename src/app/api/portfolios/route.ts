import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const db = getDb();

    if (user.role === 'partner') {
      const portfolio = db.portfolios.find((p) => p.partner_id === user.partner_id);
      const partner = db.partners.find((p) => p.id === user.partner_id);
      return NextResponse.json({
        portfolios: portfolio ? [{ ...portfolio, partner_name: partner?.full_name, partner_phone: partner?.phone }] : [],
      });
    }

    // Admin: all portfolios joined with partner names
    const portfoliosWithPartner = db.portfolios.map((pf) => {
      const partner = db.partners.find((p) => p.id === pf.partner_id);
      return {
        ...pf,
        partner_name: partner?.full_name || 'غير محدد',
        partner_phone: partner?.phone || '',
        partner_status: partner?.status || 'active',
      };
    });

    return NextResponse.json({ portfolios: portfoliosWithPartner });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
