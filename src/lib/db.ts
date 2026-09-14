import fs from 'fs';
import path from 'path';
import {
  User,
  Partner,
  Portfolio,
  Transaction,
  Deposit,
  Withdrawal,
  WithdrawalRequest,
  PortfolioValuation,
  ManagementFee,
  AuditLog,
  Notification,
  SystemSettings,
} from './types';

export interface DatabaseSchema {
  users: User[];
  partners: Partner[];
  portfolios: Portfolio[];
  transactions: Transaction[];
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  withdrawal_requests: WithdrawalRequest[];
  portfolio_valuations: PortfolioValuation[];
  management_fees: ManagementFee[];
  audit_logs: AuditLog[];
  notifications: Notification[];
  system_settings: SystemSettings;
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'database.json');

// In-memory cache synced with disk via mtime
let cachedDb: DatabaseSchema | null = null;
let lastMtime: number = 0;

export function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const stats = fs.statSync(DB_FILE);
      if (cachedDb && stats.mtimeMs === lastMtime) {
        return cachedDb;
      }

      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Normalize and guarantee all arrays exist
          parsed.users = Array.isArray(parsed.users) ? parsed.users : [];
          parsed.partners = Array.isArray(parsed.partners) ? parsed.partners : [];
          parsed.portfolios = Array.isArray(parsed.portfolios) ? parsed.portfolios : [];
          parsed.transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
          parsed.deposits = Array.isArray(parsed.deposits) ? parsed.deposits : [];
          parsed.withdrawals = Array.isArray(parsed.withdrawals) ? parsed.withdrawals : [];
          parsed.withdrawal_requests = Array.isArray(parsed.withdrawal_requests) ? parsed.withdrawal_requests : [];
          parsed.portfolio_valuations = Array.isArray(parsed.portfolio_valuations) ? parsed.portfolio_valuations : [];
          parsed.management_fees = Array.isArray(parsed.management_fees) ? parsed.management_fees : [];
          parsed.audit_logs = Array.isArray(parsed.audit_logs) ? parsed.audit_logs : [];
          parsed.notifications = Array.isArray(parsed.notifications) ? parsed.notifications : [];
          parsed.system_settings = parsed.system_settings || createDefaultSettings();

          // Ensure admin user exists
          const hasAdmin = parsed.users.some((u: any) => u.role === 'admin' || u.username === 'admin');
          if (!hasAdmin) {
            parsed.users.unshift({
              id: 'usr_admin_01',
              username: 'admin',
              password_hash: 'hash_admin123',
              full_name: 'المدير العام',
              role: 'admin',
              partner_id: null,
              status: 'active',
              created_at: new Date().toISOString(),
            });
          }

          // Ensure default management fee rate for each partner
          parsed.partners.forEach((p: any) => {
            if (p.management_fee_rate === undefined) {
              p.management_fee_rate = 2.0;
            }
          });

          cachedDb = parsed;
          lastMtime = stats.mtimeMs;
          return cachedDb as DatabaseSchema;
        }
      }
    }
  } catch (e) {
    console.error('Error reading database file:', e);
  }

  // Initialize fresh database with seed
  cachedDb = createInitialDatabase();
  saveDatabase(cachedDb);
  return cachedDb;
}

export function saveDatabase(db: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const jsonStr = JSON.stringify(db, null, 2);
    fs.writeFileSync(DB_FILE, jsonStr, 'utf-8');
    const stats = fs.statSync(DB_FILE);
    lastMtime = stats.mtimeMs;
    cachedDb = db;
  } catch (err) {
    console.error('Failed to save database to disk:', err);
    cachedDb = db;
  }
}

export function getDb(): DatabaseSchema {
  return loadDatabase();
}

function createDefaultSettings(): SystemSettings {
  return {
    system_name: 'منصة إدارة محافظ الشركاء - مركز الشاطبي',
    manager_name: 'مدير الاستثمار',
    currency: 'EGP',
    currency_symbol: 'ج.م',
    default_mgmt_fee_rate: 2.0,
    mgmt_fee_basis: 'VALUATION',
    accounting_month_start_day: 1,
    notifications_enabled: true,
  };
}

function createInitialDatabase(): DatabaseSchema {
  const now = new Date().toISOString();
  const settings = createDefaultSettings();

  const adminUser: User = {
    id: 'usr_admin_01',
    username: 'admin',
    password_hash: 'hash_admin123',
    full_name: 'المدير العام',
    role: 'admin',
    partner_id: null,
    status: 'active',
    created_at: now,
  };

  // Partner 1: أحمد محمود الشناوي
  const userAhmed: User = {
    id: 'usr_ahmed_01',
    username: 'ahmed',
    password_hash: 'hash_ahmed123',
    full_name: 'أحمد محمود الشناوي',
    role: 'partner',
    partner_id: 'prt_ahmed_01',
    status: 'active',
    created_at: '2026-06-01T09:00:00Z',
  };

  const partnerAhmed: Partner = {
    id: 'prt_ahmed_01',
    full_name: 'أحمد محمود الشناوي',
    phone: '01012345678',
    email: 'ahmed.shennawy@example.com',
    join_date: '2026-06-01',
    join_time: '09:30',
    management_fee_rate: 2.0,
    status: 'active',
    notes: 'شريك مستثمر - محفظة أسهم قيادية EGX30',
    user_id: 'usr_ahmed_01',
    created_at: '2026-06-01T09:00:00Z',
  };

  const portfolioAhmed: Portfolio = {
    id: 'port_ahmed_01',
    partner_id: 'prt_ahmed_01',
    initial_capital: 100000,
    total_deposits: 20000,
    total_withdrawals: 0,
    total_profits: 15000,
    total_losses: 0,
    current_valuation: 135000,
    total_fees_incurred: 7100,
    fees_paid: 4400,
    fees_due: 2700,
    net_value: 132300,
    last_valuation_date: '2026-08-31',
    updated_at: now,
  };

  // Partner 2: م. طارق عبد العزيز
  const userTarek: User = {
    id: 'usr_tarek_02',
    username: 'tarek',
    password_hash: 'hash_tarek123',
    full_name: 'م. طارق عبد العزيز',
    role: 'partner',
    partner_id: 'prt_tarek_02',
    status: 'active',
    created_at: '2026-05-10T10:00:00Z',
  };

  const partnerTarek: Partner = {
    id: 'prt_tarek_02',
    full_name: 'م. طارق عبد العزيز',
    phone: '01123456789',
    email: 'tarek.aziz@example.com',
    join_date: '2026-05-10',
    join_time: '10:15',
    management_fee_rate: 2.0,
    status: 'active',
    notes: 'شريك مستثمر - محفظة متوسطة إلى طويلة الأجل',
    user_id: 'usr_tarek_02',
    created_at: '2026-05-10T10:00:00Z',
  };

  const portfolioTarek: Portfolio = {
    id: 'port_tarek_02',
    partner_id: 'prt_tarek_02',
    initial_capital: 250000,
    total_deposits: 0,
    total_withdrawals: 30000,
    total_profits: 40000,
    total_losses: 0,
    current_valuation: 260000,
    total_fees_incurred: 15400,
    fees_paid: 15400,
    fees_due: 0,
    net_value: 260000,
    last_valuation_date: '2026-08-31',
    updated_at: now,
  };

  // Partner 3: د. سارة إبراهيم
  const userSarah: User = {
    id: 'usr_sarah_03',
    username: 'sarah',
    password_hash: 'hash_sarah123',
    full_name: 'د. سارة إبراهيم',
    role: 'partner',
    partner_id: 'prt_sarah_03',
    status: 'active',
    created_at: '2026-08-01T11:00:00Z',
  };

  const partnerSarah: Partner = {
    id: 'prt_sarah_03',
    full_name: 'د. سارة إبراهيم',
    phone: '01234567890',
    email: 'sarah.ibrahim@example.com',
    join_date: '2026-08-01',
    join_time: '11:30',
    management_fee_rate: 2.0,
    status: 'active',
    notes: 'شريكة مستثمرة - محفظة تنمية رأس مال متوازنة',
    user_id: 'usr_sarah_03',
    created_at: '2026-08-01T11:00:00Z',
  };

  const portfolioSarah: Portfolio = {
    id: 'port_sarah_03',
    partner_id: 'prt_sarah_03',
    initial_capital: 50000,
    total_deposits: 0,
    total_withdrawals: 0,
    total_profits: 3500,
    total_losses: 0,
    current_valuation: 53500,
    total_fees_incurred: 1000,
    fees_paid: 1000,
    fees_due: 0,
    net_value: 53500,
    last_valuation_date: '2026-09-01',
    updated_at: now,
  };

  // Initial Transactions
  const txnAhmedInit: Transaction = {
    id: 'txn_ahmed_01',
    transaction_number: 'TXN-2026-0001',
    partner_id: 'prt_ahmed_01',
    portfolio_id: 'port_ahmed_01',
    type: 'INITIAL_INVESTMENT',
    amount: 100000,
    date: '2026-06-01',
    time: '09:30',
    balance_before: 0,
    balance_after: 100000,
    created_by_user_id: 'usr_admin_01',
    payment_method: 'تحويل بنكي',
    reference_no: 'TRF-AHM-01',
    notes: 'رأس المال الابتدائي لبداية الاستثمار',
    is_reversed: 0,
    reversed_by_txn_id: null,
    created_at: '2026-06-01T09:30:00Z',
  };

  const txnAhmedFee: Transaction = {
    id: 'txn_ahmed_02',
    transaction_number: 'TXN-2026-0002',
    partner_id: 'prt_ahmed_01',
    portfolio_id: 'port_ahmed_01',
    type: 'INITIAL_MGMT_FEE',
    amount: -2000,
    date: '2026-06-01',
    time: '09:35',
    balance_before: 100000,
    balance_after: 98000,
    created_by_user_id: 'usr_admin_01',
    payment_method: 'خصم من الحساب',
    reference_no: null,
    notes: 'أتعاب إدارة - بداية الاستثمار (2% من 100,000 ج.م)',
    is_reversed: 0,
    reversed_by_txn_id: null,
    created_at: '2026-06-01T09:35:00Z',
  };

  const txnAhmedDeposit: Transaction = {
    id: 'txn_ahmed_03',
    transaction_number: 'TXN-2026-0003',
    partner_id: 'prt_ahmed_01',
    portfolio_id: 'port_ahmed_01',
    type: 'DEPOSIT',
    amount: 20000,
    date: '2026-07-01',
    time: '11:00',
    balance_before: 100000,
    balance_after: 120000,
    created_by_user_id: 'usr_admin_01',
    payment_method: 'تحويل بنكي',
    reference_no: 'DEP-2026-01',
    notes: 'زيادة رأس مال الاستثمار',
    is_reversed: 0,
    reversed_by_txn_id: null,
    created_at: '2026-07-01T11:00:00Z',
  };

  const txnAhmedValuation: Transaction = {
    id: 'txn_ahmed_04',
    transaction_number: 'TXN-2026-0004',
    partner_id: 'prt_ahmed_01',
    portfolio_id: 'port_ahmed_01',
    type: 'PROFIT',
    amount: 15000,
    date: '2026-08-31',
    time: '15:30',
    balance_before: 120000,
    balance_after: 135000,
    created_by_user_id: 'usr_admin_01',
    payment_method: 'تسوية تقييم',
    reference_no: null,
    notes: 'أرباح تقييم نهاية شهر أغسطس 2026',
    is_reversed: 0,
    reversed_by_txn_id: null,
    created_at: '2026-08-31T15:30:00Z',
  };

  const depositsAhmed: Deposit = {
    id: 'dep_ahmed_01',
    partner_id: 'prt_ahmed_01',
    portfolio_id: 'port_ahmed_01',
    transaction_id: 'txn_ahmed_03',
    amount: 20000,
    deposit_date: '2026-07-01',
    deposit_time: '11:00',
    payment_method: 'تحويل بنكي',
    reference_no: 'DEP-2026-01',
    notes: 'إيداع إضافي لتعزيز المحفظة',
    created_by: 'usr_admin_01',
    created_at: '2026-07-01T11:00:00Z',
  };

  const valuationAhmed: PortfolioValuation = {
    id: 'val_ahmed_01',
    partner_id: 'prt_ahmed_01',
    portfolio_id: 'port_ahmed_01',
    transaction_id: 'txn_ahmed_04',
    valuation_date: '2026-08-31',
    valuation_time: '15:30',
    previous_valuation: 120000,
    new_valuation: 135000,
    change_amount: 15000,
    change_percentage: 12.5,
    valuation_type: 'PROFIT',
    notes: 'تقييم دوري لشهر أغسطس',
    created_by: 'usr_admin_01',
    created_at: '2026-08-31T15:30:00Z',
  };

  const feeAhmed1: ManagementFee = {
    id: 'fee_ahmed_01',
    partner_id: 'prt_ahmed_01',
    portfolio_id: 'port_ahmed_01',
    transaction_id: 'txn_ahmed_02',
    fee_type: 'INITIAL',
    period_month: 'INITIAL',
    portfolio_value_at_calc: 100000,
    fee_percentage: 2.0,
    fee_amount: 2000,
    status: 'collected',
    calculation_date: '2026-06-01',
    collection_date: '2026-06-01',
    notes: 'أتعاب بداية الاستثمار 2%',
    created_by: 'usr_admin_01',
    created_at: '2026-06-01T09:35:00Z',
  };

  const feeAhmed2: ManagementFee = {
    id: 'fee_ahmed_02',
    partner_id: 'prt_ahmed_01',
    portfolio_id: 'port_ahmed_01',
    transaction_id: 'txn_ahmed_02',
    fee_type: 'MONTHLY',
    period_month: '2026-06',
    portfolio_value_at_calc: 120000,
    fee_percentage: 2.0,
    fee_amount: 2400,
    status: 'collected',
    calculation_date: '2026-06-30',
    collection_date: '2026-07-02',
    notes: 'أتعاب إدارة شهر يونيو',
    created_by: 'usr_admin_01',
    created_at: '2026-06-30T17:00:00Z',
  };

  const feeAhmed3: ManagementFee = {
    id: 'fee_ahmed_03',
    partner_id: 'prt_ahmed_01',
    portfolio_id: 'port_ahmed_01',
    transaction_id: 'txn_ahmed_04',
    fee_type: 'MONTHLY',
    period_month: '2026-08',
    portfolio_value_at_calc: 135000,
    fee_percentage: 2.0,
    fee_amount: 2700,
    status: 'due',
    calculation_date: '2026-08-31',
    collection_date: null,
    notes: 'أتعاب إدارة شهر أغسطس (مستحقة التحصيل)',
    created_by: 'usr_admin_01',
    created_at: '2026-08-31T15:30:00Z',
  };

  // Seed Tarek
  const txnTarekInit: Transaction = {
    id: 'txn_tarek_01',
    transaction_number: 'TXN-2026-0005',
    partner_id: 'prt_tarek_02',
    portfolio_id: 'port_tarek_02',
    type: 'INITIAL_INVESTMENT',
    amount: 250000,
    date: '2026-05-10',
    time: '10:15',
    balance_before: 0,
    balance_after: 250000,
    created_by_user_id: 'usr_admin_01',
    payment_method: 'تحويل بنكي',
    notes: 'رأس مال أولي',
    is_reversed: 0,
    reversed_by_txn_id: null,
    created_at: '2026-05-10T10:15:00Z',
  };

  const txnTarekWith: Transaction = {
    id: 'txn_tarek_02',
    transaction_number: 'TXN-2026-0006',
    partner_id: 'prt_tarek_02',
    portfolio_id: 'port_tarek_02',
    type: 'WITHDRAWAL',
    amount: -30000,
    date: '2026-07-15',
    time: '12:00',
    balance_before: 250000,
    balance_after: 220000,
    created_by_user_id: 'usr_admin_01',
    payment_method: 'تحويل بنكي',
    notes: 'سحب جزئي من الأرباح',
    is_reversed: 0,
    reversed_by_txn_id: null,
    created_at: '2026-07-15T12:00:00Z',
  };

  const withdrawalTarek: Withdrawal = {
    id: 'wdr_tarek_01',
    partner_id: 'prt_tarek_02',
    portfolio_id: 'port_tarek_02',
    transaction_id: 'txn_tarek_02',
    amount: 30000,
    withdrawal_date: '2026-07-15',
    withdrawal_time: '12:00',
    payment_method: 'تحويل بنكي',
    reference_no: 'WDR-2026-01',
    notes: 'سحب أرباح نصف سنوية',
    created_by: 'usr_admin_01',
    created_at: '2026-07-15T12:00:00Z',
  };

  const txnTarekVal: Transaction = {
    id: 'txn_tarek_03',
    transaction_number: 'TXN-2026-0007',
    partner_id: 'prt_tarek_02',
    portfolio_id: 'port_tarek_02',
    type: 'PROFIT',
    amount: 40000,
    date: '2026-08-31',
    time: '15:30',
    balance_before: 220000,
    balance_after: 260000,
    created_by_user_id: 'usr_admin_01',
    payment_method: 'تسوية تقييم',
    notes: 'أرباح تقييم المحفظة',
    is_reversed: 0,
    reversed_by_txn_id: null,
    created_at: '2026-08-31T15:30:00Z',
  };

  const valuationTarek: PortfolioValuation = {
    id: 'val_tarek_01',
    partner_id: 'prt_tarek_02',
    portfolio_id: 'port_tarek_02',
    transaction_id: 'txn_tarek_03',
    valuation_date: '2026-08-31',
    valuation_time: '15:30',
    previous_valuation: 220000,
    new_valuation: 260000,
    change_amount: 40000,
    change_percentage: 18.18,
    valuation_type: 'PROFIT',
    notes: 'تقييم أداء المحفظة الاستثمارية',
    created_by: 'usr_admin_01',
    created_at: '2026-08-31T15:30:00Z',
  };

  const feeTarek: ManagementFee = {
    id: 'fee_tarek_01',
    partner_id: 'prt_tarek_02',
    portfolio_id: 'port_tarek_02',
    transaction_id: 'txn_tarek_01',
    fee_type: 'MONTHLY',
    period_month: '2026-08',
    portfolio_value_at_calc: 260000,
    fee_percentage: 2.0,
    fee_amount: 15400,
    status: 'collected',
    calculation_date: '2026-08-31',
    collection_date: '2026-09-01',
    notes: 'أتعاب مجمعة سابقة مدفوعة بالكامل',
    created_by: 'usr_admin_01',
    created_at: '2026-08-31T15:30:00Z',
  };

  // Seed Sarah
  const txnSarahInit: Transaction = {
    id: 'txn_sarah_01',
    transaction_number: 'TXN-2026-0008',
    partner_id: 'prt_sarah_03',
    portfolio_id: 'port_sarah_03',
    type: 'INITIAL_INVESTMENT',
    amount: 50000,
    date: '2026-08-01',
    time: '11:30',
    balance_before: 0,
    balance_after: 50000,
    created_by_user_id: 'usr_admin_01',
    payment_method: 'تحويل فودافون كاش',
    notes: 'رأس مال البداية',
    is_reversed: 0,
    reversed_by_txn_id: null,
    created_at: '2026-08-01T11:30:00Z',
  };

  const txnSarahVal: Transaction = {
    id: 'txn_sarah_02',
    transaction_number: 'TXN-2026-0009',
    partner_id: 'prt_sarah_03',
    portfolio_id: 'port_sarah_03',
    type: 'PROFIT',
    amount: 3500,
    date: '2026-09-01',
    time: '10:00',
    balance_before: 50000,
    balance_after: 53500,
    created_by_user_id: 'usr_admin_01',
    payment_method: 'تسوية تقييم',
    notes: 'أرباح استثمار شهر أغسطس',
    is_reversed: 0,
    reversed_by_txn_id: null,
    created_at: '2026-09-01T10:00:00Z',
  };

  const valuationSarah: PortfolioValuation = {
    id: 'val_sarah_01',
    partner_id: 'prt_sarah_03',
    portfolio_id: 'port_sarah_03',
    transaction_id: 'txn_sarah_02',
    valuation_date: '2026-09-01',
    valuation_time: '10:00',
    previous_valuation: 50000,
    new_valuation: 53500,
    change_amount: 3500,
    change_percentage: 7.0,
    valuation_type: 'PROFIT',
    notes: 'تقييم شهر أغسطس',
    created_by: 'usr_admin_01',
    created_at: '2026-09-01T10:00:00Z',
  };

  const feeSarah: ManagementFee = {
    id: 'fee_sarah_01',
    partner_id: 'prt_sarah_03',
    portfolio_id: 'port_sarah_03',
    transaction_id: 'txn_sarah_01',
    fee_type: 'INITIAL',
    period_month: 'INITIAL',
    portfolio_value_at_calc: 50000,
    fee_percentage: 2.0,
    fee_amount: 1000,
    status: 'collected',
    calculation_date: '2026-08-01',
    collection_date: '2026-08-01',
    notes: 'أتعاب بداية الاستثمار 2%',
    created_by: 'usr_admin_01',
    created_at: '2026-08-01T11:30:00Z',
  };

  return {
    users: [adminUser, userAhmed, userTarek, userSarah],
    partners: [partnerAhmed, partnerTarek, partnerSarah],
    portfolios: [portfolioAhmed, portfolioTarek, portfolioSarah],
    transactions: [
      txnAhmedInit,
      txnAhmedFee,
      txnAhmedDeposit,
      txnAhmedValuation,
      txnTarekInit,
      txnTarekWith,
      txnTarekVal,
      txnSarahInit,
      txnSarahVal,
    ],
    deposits: [depositsAhmed],
    withdrawals: [withdrawalTarek],
    withdrawal_requests: [],
    portfolio_valuations: [valuationAhmed, valuationTarek, valuationSarah],
    management_fees: [feeAhmed1, feeAhmed2, feeAhmed3, feeTarek, feeSarah],
    audit_logs: [
      {
        id: 'aud_init_01',
        user_id: 'usr_admin_01',
        user_name: 'المدير العام',
        user_role: 'admin',
        action: 'CREATE',
        entity_type: 'system',
        entity_id: 'init',
        old_data: null,
        new_data: { message: 'تهيئة النظام وقاعدة البيانات للمحافظ' },
        ip_address: '127.0.0.1',
        timestamp: now,
      },
    ],
    notifications: [
      {
        id: 'notif_init_01',
        user_id: 'usr_admin_01',
        partner_id: null,
        title: 'مرحباً بك في منصة إدارة المحافظ',
        message: 'تم تشغيل النظام المالي والإداري وإعداد المحافظ بنجاح.',
        type: 'INFO',
        is_read: 0,
        created_at: now,
      },
    ],
    system_settings: settings,
  };
}
