import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDatabase } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { calculatePartnerMonthlyFee, recalculatePortfolio } from '@/lib/financial';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get('partner_id');
    const period = searchParams.get('period');
    const status = searchParams.get('status');

    const db = getDb();
    let fees = [...db.management_fees];

    if (user.role === 'partner') {
      fees = fees.filter((f) => f.partner_id === user.partner_id);
    } else if (partnerId && partnerId !== 'ALL') {
      fees = fees.filter((f) => f.partner_id === partnerId);
    }

    if (period && period !== 'ALL') {
      fees = fees.filter((f) => f.period_month === period);
    }

    if (status && status !== 'ALL') {
      fees = fees.filter((f) => f.status === status);
    }

    const enriched = fees.map((f) => {
      const partner = db.partners.find((p) => p.id === f.partner_id);
      return {
        ...f,
        partner_name: partner?.full_name || 'غير معروف',
      };
    });

    enriched.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return NextResponse.json({ management_fees: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Calculate monthly management fees (Single partner or Batch for all active partners)
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المدير مطلوبة لاحتساب أتعاب الإدارة' }, { status: 403 });
    }

    const body = await req.json();
    const { partner_id, period_month, fee_percentage } = body;

    if (!period_month) {
      return NextResponse.json({ error: 'الشهر المحاسبي (مثال: 2026-09) مطلوب' }, { status: 400 });
    }

    // Validate period_month format YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(period_month)) {
      return NextResponse.json({ error: 'صيغة الشهر غير صحيحة، يجب أن تكون YYYY-MM (مثلاً: 2026-09)' }, { status: 400 });
    }

    const db = getDb();
    // Only an explicit rate overrides; otherwise each partner is charged at their own rate
    const parsedRate = fee_percentage === undefined || fee_percentage === null || fee_percentage === '' ? NaN : parseFloat(fee_percentage);
    const rate: number | undefined = isNaN(parsedRate) ? undefined : parsedRate;

    if (partner_id && partner_id !== 'ALL') {
      // Single partner calculation
      const result = calculatePartnerMonthlyFee(partner_id, period_month, rate, user);
      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: result.message, fee: result.fee });
    }

    // Batch calculation for ALL active partners
    const activePartners = db.partners.filter((p) => p.status === 'active' && !p.is_manager);
    const results: any[] = [];
    const errors: string[] = [];
    let calculatedCount = 0;

    for (const partner of activePartners) {
      const calc = calculatePartnerMonthlyFee(partner.id, period_month, rate, user);
      if (calc.success) {
        calculatedCount++;
        results.push({ partner_id: partner.id, partner_name: partner.full_name, fee: calc.fee });
      } else {
        errors.push(`${partner.full_name}: ${calc.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم احتساب أتعاب شهر ${period_month} لعدد (${calculatedCount}) شريك بنجاح`,
      calculated_count: calculatedCount,
      total_active_partners: activePartners.length,
      skipped_or_existing: errors,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

