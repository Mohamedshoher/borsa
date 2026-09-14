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

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('type') || 'overview';
    const partnerId = searchParams.get('partner_id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    const db = getDb();

    // If partner, enforce isolation
    const targetPartnerId = user.role === 'partner' ? user.partner_id : (partnerId !== 'ALL' ? partnerId : null);

    let partners = [...db.partners];
    let portfolios = [...db.portfolios];
    let transactions = [...db.transactions];
    let fees = [...db.management_fees];
    let deposits = [...db.deposits];
    let withdrawals = [...db.withdrawals];
    let valuations = [...db.portfolio_valuations];

    if (targetPartnerId) {
      partners = partners.filter((p) => p.id === targetPartnerId);
      portfolios = portfolios.filter((p) => p.partner_id === targetPartnerId);
      transactions = transactions.filter((t) => t.partner_id === targetPartnerId);
      fees = fees.filter((f) => f.partner_id === targetPartnerId);
      deposits = deposits.filter((d) => d.partner_id === targetPartnerId);
      withdrawals = withdrawals.filter((w) => w.partner_id === targetPartnerId);
      valuations = valuations.filter((v) => v.partner_id === targetPartnerId);
    }

    if (fromDate) {
      transactions = transactions.filter((t) => t.date >= fromDate);
      deposits = deposits.filter((d) => d.deposit_date >= fromDate);
      withdrawals = withdrawals.filter((w) => w.withdrawal_date >= fromDate);
      valuations = valuations.filter((v) => v.valuation_date >= fromDate);
      fees = fees.filter((f) => f.calculation_date >= fromDate);
    }

    if (toDate) {
      transactions = transactions.filter((t) => t.date <= toDate);
      deposits = deposits.filter((d) => d.deposit_date <= toDate);
      withdrawals = withdrawals.filter((w) => w.withdrawal_date <= toDate);
      valuations = valuations.filter((v) => v.valuation_date <= toDate);
      fees = fees.filter((f) => f.calculation_date <= toDate);
    }

    // Totals calculations
    const totalCapital = portfolios.reduce((sum, p) => sum + p.initial_capital, 0);
    const totalValuation = portfolios.reduce((sum, p) => sum + p.current_valuation, 0);
    const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const totalProfits = portfolios.reduce((sum, p) => sum + p.total_profits, 0);
    const totalLosses = portfolios.reduce((sum, p) => sum + p.total_losses, 0);
    const netProfitLoss = totalProfits - totalLosses;
    const totalFeesIncurred = fees.reduce((sum, f) => sum + f.fee_amount, 0);
    const totalFeesCollected = fees.filter((f) => f.status === 'collected').reduce((sum, f) => sum + f.fee_amount, 0);
    const totalFeesDue = fees.filter((f) => f.status === 'due').reduce((sum, f) => sum + f.fee_amount, 0);
    const totalNetValue = portfolios.reduce((sum, p) => sum + p.net_value, 0);

    // Return aggregated payload
    return NextResponse.json({
      summary: {
        total_partners: partners.length,
        total_capital: totalCapital,
        total_valuation: totalValuation,
        total_deposits: totalDeposits,
        total_withdrawals: totalWithdrawals,
        total_profits: totalProfits,
        total_losses: totalLosses,
        net_profit_loss: netProfitLoss,
        total_fees_incurred: totalFeesIncurred,
        total_fees_collected: totalFeesCollected,
        total_fees_due: totalFeesDue,
        total_net_value: totalNetValue,
        overall_roi_percentage: totalCapital > 0 ? Math.round((netProfitLoss / totalCapital) * 10000) / 100 : 0,
      },
      partners: partners.map((p) => {
        const pf = portfolios.find((x) => x.partner_id === p.id);
        return {
          ...p,
          initial_capital: pf?.initial_capital || 0,
          current_valuation: pf?.current_valuation || 0,
          total_profits: pf?.total_profits || 0,
          total_losses: pf?.total_losses || 0,
          fees_due: pf?.fees_due || 0,
          fees_paid: pf?.fees_paid || 0,
          net_value: pf?.net_value || 0,
          roi_percentage: (pf?.initial_capital || 0) > 0 ? Math.round(((pf?.total_profits || 0) - (pf?.total_losses || 0)) / (pf?.initial_capital || 1) * 10000) / 100 : 0,
        };
      }),
      deposits,
      withdrawals,
      management_fees: fees,
      valuations,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
