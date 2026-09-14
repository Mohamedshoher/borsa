export type UserRole = 'admin' | 'partner';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  username: string;
  password_hash?: string;
  full_name: string;
  role: UserRole;
  partner_id?: string | null;
  status: UserStatus;
  created_at: string;
}

export interface Partner {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  join_date: string;
  join_time: string;
  management_fee_rate: number; // default 2.0, can be customized per partner
  status: UserStatus;
  notes: string | null;
  user_id: string | null;
  created_at: string;
  // Included via joins:
  portfolio?: Portfolio;
  username?: string;
}

export interface Portfolio {
  id: string;
  partner_id: string;
  initial_capital: number;
  total_deposits: number;
  total_withdrawals: number;
  total_profits: number;
  total_losses: number;
  current_valuation: number;
  total_fees_incurred: number;
  fees_paid: number;
  fees_due: number;
  net_value: number;
  last_valuation_date: string;
  updated_at: string;
  // Join fields:
  partner_name?: string;
  partner_phone?: string;
}

export type TransactionType =
  | 'INITIAL_INVESTMENT'    // بداية الاستثمار
  | 'DEPOSIT'               // إيداع إضافي
  | 'WITHDRAWAL'            // سحب
  | 'PROFIT'                // أرباح استثمار
  | 'LOSS'                  // خسائر استثمار
  | 'INITIAL_MGMT_FEE'      // أتعاب إدارة - بداية الاستثمار
  | 'MONTHLY_MGMT_FEE'      // أتعاب إدارة - شهرية
  | 'SETTLEMENT'            // تسوية
  | 'REVERSAL';             // عكس عملية / تصحيح محاسبي

export interface Transaction {
  id: string;
  transaction_number: string;
  partner_id: string;
  portfolio_id: string;
  type: TransactionType;
  amount: number; // positive for inflows/gains, negative for outflows/fees/losses
  date: string;
  time: string;
  balance_before: number;
  balance_after: number;
  created_by_user_id: string;
  created_by_name?: string;
  payment_method?: string | null;
  reference_no?: string | null;
  notes?: string | null;
  is_reversed: number; // 0 or 1
  reversed_by_txn_id?: string | null;
  created_at: string;
  partner_name?: string;
}

export interface Deposit {
  id: string;
  partner_id: string;
  portfolio_id: string;
  transaction_id: string;
  amount: number;
  deposit_date: string;
  deposit_time: string;
  payment_method: string;
  reference_no: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  partner_name?: string;
}

export interface Withdrawal {
  id: string;
  partner_id: string;
  portfolio_id: string;
  transaction_id: string;
  request_id: string | null;
  amount: number;
  withdrawal_date: string;
  withdrawal_time: string;
  payment_method: string;
  reference_no: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  partner_name?: string;
}

export type WithdrawalRequestStatus = 'pending' | 'approved' | 'rejected';

export interface WithdrawalRequest {
  id: string;
  partner_id: string;
  amount: number;
  request_date: string;
  request_time: string;
  reason: string | null;
  notes: string | null;
  status: WithdrawalRequestStatus;
  admin_notes: string | null;
  approved_amount: number | null;
  reviewed_by: string | null;
  reviewed_by_name?: string | null;
  reviewed_at: string | null;
  created_at: string;
  partner_name?: string;
  partner_phone?: string;
  current_valuation?: number;
}

export interface PortfolioValuation {
  id: string;
  partner_id: string;
  portfolio_id: string;
  transaction_id: string | null;
  previous_valuation: number;
  new_valuation: number;
  change_amount: number;
  change_percentage: number;
  valuation_date: string;
  valuation_time: string;
  valuation_type: 'PROFIT' | 'LOSS' | 'MANUAL_REVAL';
  reason: string | null;
  notes: string | null;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  partner_name?: string;
}

export type FeeType = 'INITIAL' | 'MONTHLY';
export type FeeStatus = 'due' | 'collected';

export interface ManagementFee {
  id: string;
  partner_id: string;
  portfolio_id: string;
  transaction_id: string | null;
  fee_type: FeeType;
  period_month: string; // e.g. "2026-09" or "INITIAL"
  portfolio_value_at_calc: number;
  fee_percentage: number; // default 2.0 or custom partner rate
  fee_amount: number;
  status: FeeStatus;
  calculation_date: string;
  collection_date: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  partner_name?: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'CALCULATE' | 'APPROVE' | 'REJECT' | 'REVERSE';
  entity_type: 'partner' | 'portfolio' | 'transaction' | 'withdrawal_request' | 'fee' | 'settings' | 'auth';
  entity_id: string | null;
  old_data: any;
  new_data: any;
  ip_address: string | null;
  timestamp: string;
}

export interface Notification {
  id: string;
  user_id: string;
  partner_id: string | null;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  is_read: number;
  created_at: string;
}

export interface SystemSettings {
  system_name: string;
  manager_name: string;
  currency: string;
  currency_symbol: string;
  default_mgmt_fee_rate: number;
  mgmt_fee_basis: string;
  accounting_month_start_day: number;
  notifications_enabled: boolean;
}
