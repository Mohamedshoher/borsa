import { getDb, saveDatabase, DatabaseSchema } from './db';
import { Portfolio, TransactionType, Transaction, User, ManagementFee } from './types';
import { recordAuditLog } from './audit';

export function generateTransactionNumber(db: DatabaseSchema): string {
  const currentYear = new Date().getFullYear();
  const prefix = `TXN-${currentYear}-`;

  let maxSeq = 1000;
  for (const txn of db.transactions) {
    if (txn.transaction_number.startsWith(prefix)) {
      const parts = txn.transaction_number.split('-');
      if (parts.length === 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  }

  return `${prefix}${(maxSeq + 1).toString().padStart(4, '0')}`;
}

/**
 * Recalculate portfolio balances based on all child records
 */
export function recalculatePortfolio(partnerId: string): Portfolio {
  const db = getDb();
  const portIndex = db.portfolios.findIndex((p) => p.partner_id === partnerId);
  if (portIndex === -1) {
    throw new Error(`لم يتم العثور على محفظة للشريك ${partnerId}`);
  }

  const portfolio = db.portfolios[portIndex];

  // Aggregate deposits
  const totalDeposits = db.deposits
    .filter((d) => d.partner_id === partnerId)
    .reduce((sum, d) => sum + d.amount, 0);

  // Aggregate withdrawals
  const totalWithdrawals = db.withdrawals
    .filter((w) => w.partner_id === partnerId)
    .reduce((sum, w) => sum + w.amount, 0);

  // Aggregate profits and losses from valuations
  const totalProfits = db.portfolio_valuations
    .filter((v) => v.partner_id === partnerId && v.valuation_type === 'PROFIT')
    .reduce((sum, v) => sum + v.change_amount, 0);

  const totalLosses = db.portfolio_valuations
    .filter((v) => v.partner_id === partnerId && v.valuation_type === 'LOSS')
    .reduce((sum, v) => sum + Math.abs(v.change_amount), 0);

  // Aggregate fees
  const partnerFees = db.management_fees.filter((f) => f.partner_id === partnerId);
  const totalFeesIncurred = partnerFees.reduce((sum, f) => sum + f.fee_amount, 0);
  const feesPaid = partnerFees.filter((f) => f.status === 'collected').reduce((sum, f) => sum + f.fee_amount, 0);
  const feesDue = partnerFees.filter((f) => f.status === 'due').reduce((sum, f) => sum + f.fee_amount, 0);

  // Calculation: Current = Initial + Deposits - Withdrawals + Profits - Losses
  const currentValuation = Math.max(
    0,
    portfolio.initial_capital + totalDeposits - totalWithdrawals + totalProfits - totalLosses
  );

  // Net Value = Current Valuation - Fees Due
  const netValue = Math.max(0, currentValuation - feesDue);

  const updated: Portfolio = {
    ...portfolio,
    total_deposits: totalDeposits,
    total_withdrawals: totalWithdrawals,
    total_profits: totalProfits,
    total_losses: totalLosses,
    current_valuation: currentValuation,
    total_fees_incurred: totalFeesIncurred,
    fees_paid: feesPaid,
    fees_due: feesDue,
    net_value: netValue,
    updated_at: new Date().toISOString(),
  };

  db.portfolios[portIndex] = updated;
  saveDatabase(db);
  return updated;
}

/**
 * Record a transaction in master ledger
 */
export function recordTransaction(params: {
  partnerId: string;
  portfolioId: string;
  type: TransactionType;
  amount: number;
  date: string;
  time: string;
  balanceBefore: number;
  balanceAfter: number;
  createdById: string;
  paymentMethod?: string;
  referenceNo?: string;
  notes?: string;
}): Transaction {
  const db = getDb();
  const txnId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const txnNumber = generateTransactionNumber(db);
  const now = new Date().toISOString();

  const txn: Transaction = {
    id: txnId,
    transaction_number: txnNumber,
    partner_id: params.partnerId,
    portfolio_id: params.portfolioId,
    type: params.type,
    amount: params.amount,
    date: params.date,
    time: params.time,
    balance_before: params.balanceBefore,
    balance_after: params.balanceAfter,
    created_by_user_id: params.createdById,
    payment_method: params.paymentMethod || null,
    reference_no: params.referenceNo || null,
    notes: params.notes || null,
    is_reversed: 0,
    reversed_by_txn_id: null,
    created_at: now,
  };

  db.transactions.unshift(txn);
  saveDatabase(db);
  return txn;
}

/**
 * Reverse an existing transaction
 */
export function reverseTransaction(
  txnId: string,
  reason: string,
  user: User
): { success: boolean; message: string; reversalTxn?: Transaction } {
  const db = getDb();
  const txnIndex = db.transactions.findIndex((t) => t.id === txnId);
  if (txnIndex === -1) {
    return { success: false, message: 'العملية غير موجودة' };
  }

  const txn = db.transactions[txnIndex];
  if (txn.is_reversed === 1) {
    return { success: false, message: 'هذه العملية تم عكسها وتصحيحها مسبقاً' };
  }

  const portfolio = db.portfolios.find((p) => p.id === txn.portfolio_id);
  if (!portfolio) {
    return { success: false, message: 'محفظة الشريك غير موجودة' };
  }

  const oppositeAmount = -txn.amount;
  const balanceBefore = portfolio.current_valuation;
  const balanceAfter = Math.max(0, balanceBefore + oppositeAmount);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

  const reversalTxn = recordTransaction({
    partnerId: txn.partner_id,
    portfolioId: txn.portfolio_id,
    type: 'REVERSAL',
    amount: oppositeAmount,
    date: dateStr,
    time: timeStr,
    balanceBefore,
    balanceAfter,
    createdById: user.id,
    notes: `عكس للعملية (${txn.transaction_number}) - سبب الإلغاء: ${reason}`,
  });

  // Mark original transaction as reversed
  db.transactions[txnIndex].is_reversed = 1;
  db.transactions[txnIndex].reversed_by_txn_id = reversalTxn.id;
  saveDatabase(db);

  if (txn.type === 'PROFIT' || txn.type === 'LOSS') {
    db.portfolio_valuations = db.portfolio_valuations.filter((v) => v.transaction_id !== txnId);
    saveDatabase(db);
  } else if (txn.type === 'DEPOSIT') {
    db.deposits = db.deposits.filter((d) => d.transaction_id !== txnId);
    saveDatabase(db);
  } else if (txn.type === 'WITHDRAWAL') {
    db.withdrawals = db.withdrawals.filter((w) => w.transaction_id !== txnId);
    saveDatabase(db);
  }

  // Recalculate portfolio
  recalculatePortfolio(txn.partner_id);

  // Record Audit Log
  recordAuditLog(
    user,
    'REVERSE',
    'transaction',
    txnId,
    txn,
    { reversal_txn_id: reversalTxn.id, reason }
  );

  return { success: true, message: 'تم عكس العملية بنجاح وتسجيل قيد التصحيح المحاسبي', reversalTxn };
}

/**
 * Calculate Monthly Management Fee for a partner for a specific period (e.g., '2026-09')
 * Uses partner's customized management_fee_rate if available!
 */
export function calculatePartnerMonthlyFee(
  partnerId: string,
  periodMonth: string,
  feePercentage?: number,
  user?: User
): { success: boolean; message: string; fee?: ManagementFee } {
  const db = getDb();
  const partner = db.partners.find((p) => p.id === partnerId);
  const portfolio = db.portfolios.find((p) => p.partner_id === partnerId);

  if (!partner || !portfolio) {
    return { success: false, message: 'الشريك أو المحفظة غير موجودة' };
  }

  // Check if fee already calculated for this partner and period
  const existingFee = db.management_fees.find(
    (f) => f.partner_id === partnerId && f.period_month === periodMonth && f.fee_type === 'MONTHLY'
  );

  if (existingFee) {
    return {
      success: false,
      message: `تم احتساب أتعاب إدارة شهر (${periodMonth}) مسبقاً للشريك (${partner.full_name}) بقيمة (${existingFee.fee_amount} ج.م) بتاريخ (${existingFee.calculation_date}). لا يمكن تكرار الاحتساب!`,
    };
  }

  // Use partner's custom rate if not explicitly overridden
  const effectiveRate = feePercentage !== undefined ? feePercentage : (partner.management_fee_rate || 2.0);

  const valuation = portfolio.current_valuation;
  const feeAmount = Math.round(valuation * (effectiveRate / 100) * 100) / 100;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const feeId = `fee_${partnerId}_${periodMonth.replace('-', '_')}`;

  const newFee: ManagementFee = {
    id: feeId,
    partner_id: partnerId,
    portfolio_id: portfolio.id,
    transaction_id: null,
    fee_type: 'MONTHLY',
    period_month: periodMonth,
    portfolio_value_at_calc: valuation,
    fee_percentage: effectiveRate,
    fee_amount: feeAmount,
    status: 'due',
    calculation_date: dateStr,
    collection_date: null,
    notes: `أتعاب إدارة شهرية (${periodMonth}) بنسبة ${effectiveRate}% على تقييم ${valuation} ج.م`,
    created_by: user?.id || 'admin',
    created_at: now.toISOString(),
  };

  db.management_fees.unshift(newFee);
  saveDatabase(db);

  // Recalculate portfolio fees due and net value
  recalculatePortfolio(partnerId);

  // Record Audit
  if (user) {
    recordAuditLog(
      user,
      'CALCULATE',
      'fee',
      feeId,
      null,
      { partner_name: partner.full_name, period: periodMonth, fee_amount: feeAmount, rate: effectiveRate }
    );
  }

  // Notification for admin and partner
  db.notifications.unshift({
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    user_id: partner.user_id || 'system',
    partner_id: partner.id,
    title: `استحقاق أتعاب إدارة شهر ${periodMonth}`,
    message: `تم احتساب أتعاب إدارة المحفظة لشهر ${periodMonth} بقيمة ${feeAmount} ج.م (${effectiveRate}% من قيمة المحفظة).`,
    type: 'INFO',
    is_read: 0,
    created_at: now.toISOString(),
  });
  saveDatabase(db);

  return {
    success: true,
    message: `تم احتساب أتعاب شهر ${periodMonth} للشريك (${partner.full_name}) بنسبة ${effectiveRate}% بنجاح بقيمة ${feeAmount} ج.م`,
    fee: newFee,
  };
}
