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

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Value of one fund unit. The fund starts at 1.0 and moves only with profit/loss. */
export function getNav(db: DatabaseSchema): number {
  const { total_units, invested_value, idle_cash } = db.fund;
  return total_units > 0 ? (invested_value + idle_cash) / total_units : 1;
}

export function getFundTotal(db: DatabaseSchema): number {
  return round2(db.fund.invested_value + db.fund.idle_cash);
}

export function getManagerPartner(db: DatabaseSchema) {
  return db.partners.find((p) => p.is_manager) || null;
}

/**
 * Recompute every portfolio from the pooled fund: a partner's value is simply
 * units x NAV, and their share of invested / idle money follows their ownership %.
 * Does not save.
 */
export function refreshPortfolios(db: DatabaseSchema): void {
  const nav = getNav(db);
  const { total_units, invested_value, idle_cash } = db.fund;

  for (const pf of db.portfolios) {
    const pid = pf.partner_id;
    const units = pf.units || 0;
    const ownership = total_units > 0 ? units / total_units : 0;
    const value = round2(units * nav);

    const partnerFees = db.management_fees.filter((f) => f.partner_id === pid);
    const receivedFees = db.management_fees.filter((f) => f.manager_partner_id === pid);
    const valuations = db.portfolio_valuations.filter((v) => v.partner_id === pid);

    pf.total_deposits = db.deposits.filter((d) => d.partner_id === pid).reduce((sum, d) => sum + d.amount, 0);
    pf.total_withdrawals = db.withdrawals.filter((w) => w.partner_id === pid).reduce((sum, w) => sum + w.amount, 0);
    pf.total_profits = valuations.filter((v) => v.valuation_type === 'PROFIT').reduce((sum, v) => sum + v.change_amount, 0);
    pf.total_losses = valuations.filter((v) => v.valuation_type === 'LOSS').reduce((sum, v) => sum + Math.abs(v.change_amount), 0);

    // Fees are settled instantly by moving units, so nothing stays "due"
    pf.total_fees_incurred = partnerFees.reduce((sum, f) => sum + f.fee_amount, 0);
    pf.fees_paid = pf.total_fees_incurred;
    pf.fees_due = 0;
    pf.fees_received = receivedFees.reduce((sum, f) => sum + f.fee_amount, 0);

    pf.units = units;
    pf.ownership_pct = ownership * 100;
    pf.invested_value = round2(ownership * invested_value);
    pf.idle_value = round2(ownership * idle_cash);
    pf.current_valuation = value;
    pf.net_value = value;
    pf.updated_at = new Date().toISOString();
  }
}

/** Recalculate and persist all portfolios; returns the requested partner's portfolio. */
export function recalculatePortfolio(partnerId: string): Portfolio {
  const db = getDb();
  const portfolio = db.portfolios.find((p) => p.partner_id === partnerId);
  if (!portfolio) {
    throw new Error(`لم يتم العثور على محفظة للشريك ${partnerId}`);
  }
  refreshPortfolios(db);
  saveDatabase(db);
  return portfolio;
}

/**
 * Add money for a partner: they receive units at the current NAV, so existing
 * partners' shares are diluted proportionally, never their value.
 * By default new money sits as idle cash until the manager invests it.
 */
export function contributeToFund(
  db: DatabaseSchema,
  partnerId: string,
  amount: number,
  invest = false
): { units: number; nav: number } {
  const portfolio = db.portfolios.find((p) => p.partner_id === partnerId);
  if (!portfolio) throw new Error('محفظة الشريك غير موجودة');

  const nav = getNav(db);
  const units = round6(amount / nav);
  portfolio.units = round6((portfolio.units || 0) + units);
  db.fund.total_units = round6(db.fund.total_units + units);
  if (invest) db.fund.invested_value = round2(db.fund.invested_value + amount);
  else db.fund.idle_cash = round2(db.fund.idle_cash + amount);
  return { units, nav };
}

/** Remove money for a partner. Idle cash is used first, then invested money. */
export function redeemFromFund(
  db: DatabaseSchema,
  partnerId: string,
  amount: number
): { units: number; nav: number; fromIdle: number; fromInvested: number } {
  const portfolio = db.portfolios.find((p) => p.partner_id === partnerId);
  if (!portfolio) throw new Error('محفظة الشريك غير موجودة');

  const nav = getNav(db);
  const held = portfolio.units || 0;
  const value = round2(held * nav);
  if (amount > value + 0.005) throw new Error(`المبلغ يتجاوز قيمة حصة الشريك (${value})`);

  // Withdrawing everything must burn every unit to avoid rounding dust
  const units = amount >= value - 0.005 ? held : Math.min(held, round6(amount / nav));
  portfolio.units = round6(held - units);
  db.fund.total_units = round6(db.fund.total_units - units);

  const fromIdle = Math.min(db.fund.idle_cash, amount);
  const fromInvested = round2(amount - fromIdle);
  db.fund.idle_cash = round2(db.fund.idle_cash - fromIdle);
  db.fund.invested_value = round2(db.fund.invested_value - fromInvested);
  if (db.fund.total_units <= 0) {
    db.fund.total_units = 0;
    db.fund.idle_cash = Math.max(0, db.fund.idle_cash);
  }
  return { units, nav, fromIdle, fromInvested };
}

/** Move money between the wallet (idle) and the market (invested). No P&L. */
export function allocateFund(db: DatabaseSchema, direction: 'INVEST' | 'DIVEST', amount: number): void {
  if (direction === 'INVEST') {
    if (amount > db.fund.idle_cash + 0.005) throw new Error(`السيولة الحرة (${db.fund.idle_cash}) لا تكفي لاستثمار ${amount}`);
    db.fund.idle_cash = round2(db.fund.idle_cash - amount);
    db.fund.invested_value = round2(db.fund.invested_value + amount);
  } else {
    if (amount > db.fund.invested_value + 0.005) throw new Error(`المبلغ المستثمر (${db.fund.invested_value}) لا يكفي لسحب ${amount}`);
    db.fund.invested_value = round2(db.fund.invested_value - amount);
    db.fund.idle_cash = round2(db.fund.idle_cash + amount);
  }
}

/**
 * Set the new market value of the money that is working. The change is shared by
 * ALL partners according to their units; idle cash is untouched.
 */
export function applyFundValuation(
  db: DatabaseSchema,
  newInvestedValue: number,
  meta: { date: string; time: string; reason?: string; notes?: string; user: User }
): { batchId: string; changeAmount: number; changePercentage: number } {
  const previousInvested = db.fund.invested_value;
  if (previousInvested <= 0) {
    throw new Error('لا توجد أموال مستثمرة حالياً. حوّل جزءاً من السيولة إلى الاستثمار أولاً');
  }
  const changeAmount = round2(newInvestedValue - previousInvested);
  if (changeAmount === 0) throw new Error('القيمة الجديدة مطابقة للقيمة الحالية، لا يوجد تغير لتسجيله');

  const changePercentage = round2((changeAmount / previousInvested) * 100);
  const type: 'PROFIT' | 'LOSS' = changeAmount > 0 ? 'PROFIT' : 'LOSS';
  const navBefore = getNav(db);
  const totalUnits = db.fund.total_units;
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();

  db.fund.invested_value = round2(newInvestedValue);
  db.fund.last_valuation_date = meta.date;
  const navAfter = getNav(db);

  for (const pf of db.portfolios) {
    const units = pf.units || 0;
    if (units <= 0) continue;
    const before = round2(units * navBefore);
    const after = round2(units * navAfter);
    const share = round2(after - before);

    const txn = recordTransaction({
      partnerId: pf.partner_id,
      portfolioId: pf.id,
      type,
      amount: share,
      date: meta.date,
      time: meta.time,
      balanceBefore: before,
      balanceAfter: after,
      createdById: meta.user.id,
      paymentMethod: type === 'PROFIT' ? 'أرباح استثمار وتداول' : 'خسائر استثمار وتداول',
      notes: meta.notes || `توزيع ${type === 'PROFIT' ? 'ربح' : 'خسارة'} المحفظة (${changePercentage}% على الأموال العاملة) بنسبة حصتك ${round2((units / totalUnits) * 100)}%`,
    });

    db.portfolio_valuations.unshift({
      id: `val_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      batch_id: batchId,
      ownership_pct: round2((units / totalUnits) * 100),
      partner_id: pf.partner_id,
      portfolio_id: pf.id,
      transaction_id: txn.id,
      previous_valuation: before,
      new_valuation: after,
      change_amount: share,
      change_percentage: changePercentage,
      valuation_date: meta.date,
      valuation_time: meta.time,
      valuation_type: type,
      reason: meta.reason || (type === 'PROFIT' ? 'أرباح تداول' : 'تراجع في التقييم السوقي'),
      notes: meta.notes || null,
      created_by: meta.user.id,
      created_at: nowIso,
    });
  }

  return { batchId, changeAmount, changePercentage };
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
  units?: number;
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
    units: params.units,
    is_reversed: 0,
    reversed_by_txn_id: null,
    created_at: now,
  };

  db.transactions.unshift(txn);
  saveDatabase(db);
  return txn;
}

/**
 * Reverse an existing deposit / withdrawal / initial investment.
 * Because profit is shared by units, only the latest fund event can be undone
 * cleanly; anything older must be corrected with a new opposite operation.
 */
export function reverseTransaction(
  txnId: string,
  reason: string,
  user: User
): { success: boolean; message: string; reversalTxn?: Transaction } {
  const db = getDb();
  const txn = db.transactions.find((t) => t.id === txnId);
  if (!txn) {
    return { success: false, message: 'العملية غير موجودة' };
  }
  if (txn.is_reversed === 1) {
    return { success: false, message: 'هذه العملية تم عكسها وتصحيحها مسبقاً' };
  }
  if (!['DEPOSIT', 'WITHDRAWAL', 'INITIAL_INVESTMENT'].includes(txn.type) || txn.units === undefined) {
    return {
      success: false,
      message: 'لا يمكن عكس هذا النوع من العمليات لأنه موزّع على كل الشركاء بنسبة الحصص. سجّل تقييماً جديداً لتصحيح الأرباح والخسائر',
    };
  }
  const hasLaterEvents = db.transactions.some(
    (t) => t.id !== txn.id && t.created_at > txn.created_at && t.type !== 'REVERSAL'
  );
  if (hasLaterEvents) {
    return {
      success: false,
      message: 'تمت عمليات على المحفظة بعد هذه العملية، وعكسها الآن سيغيّر حصص باقي الشركاء. سجّل عملية عكسية جديدة بدلاً من ذلك',
    };
  }

  const portfolio = db.portfolios.find((p) => p.id === txn.portfolio_id);
  if (!portfolio) {
    return { success: false, message: 'محفظة الشريك غير موجودة' };
  }

  const nav = getNav(db);
  const balanceBefore = round2((portfolio.units || 0) * nav);
  const amount = Math.abs(txn.amount);

  try {
    if (txn.units > 0) {
      // Money that came in goes back out: take the units and the cash away
      portfolio.units = round6((portfolio.units || 0) - txn.units);
      db.fund.total_units = round6(db.fund.total_units - txn.units);
      const fromIdle = Math.min(db.fund.idle_cash, amount);
      db.fund.idle_cash = round2(db.fund.idle_cash - fromIdle);
      db.fund.invested_value = round2(db.fund.invested_value - (amount - fromIdle));
    } else {
      // Money that went out returns as idle cash
      portfolio.units = round6((portfolio.units || 0) - txn.units);
      db.fund.total_units = round6(db.fund.total_units - txn.units);
      db.fund.idle_cash = round2(db.fund.idle_cash + amount);
    }
  } catch (e: any) {
    return { success: false, message: e.message };
  }

  const balanceAfter = round2((portfolio.units || 0) * nav);
  const now = new Date();
  const reversalTxn = recordTransaction({
    partnerId: txn.partner_id,
    portfolioId: txn.portfolio_id,
    type: 'REVERSAL',
    amount: -txn.amount,
    date: now.toISOString().split('T')[0],
    time: now.toTimeString().split(' ')[0].substring(0, 5),
    balanceBefore,
    balanceAfter,
    createdById: user.id,
    units: -txn.units,
    notes: `عكس للعملية (${txn.transaction_number}) - سبب الإلغاء: ${reason}`,
  });

  txn.is_reversed = 1;
  txn.reversed_by_txn_id = reversalTxn.id;

  if (txn.type === 'DEPOSIT') db.deposits = db.deposits.filter((d) => d.transaction_id !== txnId);
  else if (txn.type === 'WITHDRAWAL') db.withdrawals = db.withdrawals.filter((w) => w.transaction_id !== txnId);

  refreshPortfolios(db);
  saveDatabase(db);

  recordAuditLog(user, 'REVERSE', 'transaction', txnId, txn, { reversal_txn_id: reversalTxn.id, reason });

  return { success: true, message: 'تم عكس العملية بنجاح وتسجيل قيد التصحيح المحاسبي', reversalTxn };
}

/**
 * Monthly management fee: a percentage of the partner's share is moved, as units,
 * from the partner to the manager's account. Total fund value does not change.
 * The rate is the partner's own rate unless explicitly overridden.
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
  const manager = getManagerPartner(db);
  const managerPortfolio = manager ? db.portfolios.find((p) => p.partner_id === manager.id) : null;

  if (!partner || !portfolio) {
    return { success: false, message: 'الشريك أو المحفظة غير موجودة' };
  }
  if (!manager || !managerPortfolio) {
    return { success: false, message: 'حساب المدير غير موجود لاستقبال الأتعاب' };
  }
  if (partner.is_manager) {
    return { success: false, message: 'المدير لا يدفع أتعاب إدارة لنفسه' };
  }

  const existingFee = db.management_fees.find(
    (f) => f.partner_id === partnerId && f.period_month === periodMonth && f.fee_type === 'MONTHLY'
  );
  if (existingFee) {
    return {
      success: false,
      message: `تم احتساب أتعاب إدارة شهر (${periodMonth}) مسبقاً للشريك (${partner.full_name}) بقيمة (${existingFee.fee_amount} ج.م) بتاريخ (${existingFee.calculation_date}). لا يمكن تكرار الاحتساب!`,
    };
  }

  const effectiveRate = feePercentage !== undefined ? feePercentage : partner.management_fee_rate;
  if (!effectiveRate || effectiveRate <= 0) {
    return { success: false, message: `نسبة الأتعاب للشريك (${partner.full_name}) صفر، لا توجد أتعاب للاحتساب` };
  }

  const nav = getNav(db);
  const units = portfolio.units || 0;
  const valuation = round2(units * nav);
  const feeUnits = round6(units * (effectiveRate / 100));
  const feeAmount = round2(feeUnits * nav);
  if (feeUnits <= 0) {
    return { success: false, message: `لا توجد حصص للشريك (${partner.full_name}) لاحتساب الأتعاب عليها` };
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
  const managerBefore = round2((managerPortfolio.units || 0) * nav);

  // Move the units
  portfolio.units = round6(units - feeUnits);
  managerPortfolio.units = round6((managerPortfolio.units || 0) + feeUnits);

  const payerTxn = recordTransaction({
    partnerId,
    portfolioId: portfolio.id,
    type: 'MONTHLY_MGMT_FEE',
    amount: -feeAmount,
    date: dateStr,
    time: timeStr,
    balanceBefore: valuation,
    balanceAfter: round2(valuation - feeAmount),
    createdById: user?.id || 'admin',
    paymentMethod: 'خصم تلقائي من الحصص',
    units: -feeUnits,
    notes: `أتعاب إدارة شهر ${periodMonth} بنسبة ${effectiveRate}% من قيمة حصتك (${valuation} ج.م)`,
  });
  recordTransaction({
    partnerId: manager.id,
    portfolioId: managerPortfolio.id,
    type: 'MONTHLY_MGMT_FEE',
    amount: feeAmount,
    date: dateStr,
    time: timeStr,
    balanceBefore: managerBefore,
    balanceAfter: round2(managerBefore + feeAmount),
    createdById: user?.id || 'admin',
    paymentMethod: 'إضافة تلقائية على رأس المال',
    units: feeUnits,
    notes: `أتعاب إدارة شهر ${periodMonth} من ${partner.full_name} (${effectiveRate}%)`,
  });

  const newFee: ManagementFee = {
    id: `fee_${partnerId}_${periodMonth.replace('-', '_')}`,
    partner_id: partnerId,
    portfolio_id: portfolio.id,
    transaction_id: payerTxn.id,
    fee_type: 'MONTHLY',
    period_month: periodMonth,
    portfolio_value_at_calc: valuation,
    fee_percentage: effectiveRate,
    fee_amount: feeAmount,
    units_transferred: feeUnits,
    manager_partner_id: manager.id,
    status: 'collected',
    calculation_date: dateStr,
    collection_date: dateStr,
    notes: `أتعاب إدارة شهرية (${periodMonth}) بنسبة ${effectiveRate}% على قيمة حصة ${valuation} ج.م - أُضيفت تلقائياً لرأس مال المدير`,
    created_by: user?.id || 'admin',
    created_at: now.toISOString(),
  };
  db.management_fees.unshift(newFee);

  refreshPortfolios(db);

  if (user) {
    recordAuditLog(user, 'CALCULATE', 'fee', newFee.id, null, {
      partner_name: partner.full_name,
      period: periodMonth,
      fee_amount: feeAmount,
      units: feeUnits,
      rate: effectiveRate,
    });
  }

  db.notifications.unshift({
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    user_id: partner.user_id || 'system',
    partner_id: partner.id,
    title: `أتعاب إدارة شهر ${periodMonth}`,
    message: `تم خصم أتعاب الإدارة لشهر ${periodMonth} بقيمة ${feeAmount} ج.م (${effectiveRate}% من قيمة حصتك).`,
    type: 'INFO',
    is_read: 0,
    created_at: now.toISOString(),
  });
  saveDatabase(db);

  return {
    success: true,
    message: `تم احتساب أتعاب شهر ${periodMonth} للشريك (${partner.full_name}) بنسبة ${effectiveRate}% بقيمة ${feeAmount} ج.م وإضافتها لرأس مال المدير`,
    fee: newFee,
  };
}
