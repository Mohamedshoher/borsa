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

// In-memory cache synced with disk
let cachedDb: DatabaseSchema | null = null;

export function loadDatabase(): DatabaseSchema {
  if (cachedDb) {
    return cachedDb;
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      cachedDb = JSON.parse(raw);
      if (cachedDb && cachedDb.users && cachedDb.users.length > 0) {
        // Ensure all partners have management_fee_rate
        cachedDb.partners.forEach((p) => {
          if (p.management_fee_rate === undefined) {
            p.management_fee_rate = 2.0;
          }
        });
        return cachedDb;
      }
    } catch (e) {
      console.error('Error reading database file, re-initializing...', e);
    }
  }

  // Initialize fresh database with seed
  cachedDb = createInitialDatabase();
  saveDatabase(cachedDb);
  return cachedDb;
}

export function saveDatabase(db: DatabaseSchema): void {
  cachedDb = db;
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Failed to save database to disk:', err);
  }
}

export function getDb(): DatabaseSchema {
  return loadDatabase();
}

function createInitialDatabase(): DatabaseSchema {
  const now = new Date().toISOString();

  const settings: SystemSettings = {
    system_name: 'منصة إدارة محافظ الشركاء - مركز الشاطبي',
    manager_name: 'محمد مصطفى شكر (مدير الاستثمار)',
    currency: 'EGP',
    currency_symbol: 'ج.م',
    default_mgmt_fee_rate: 2.0,
    mgmt_fee_basis: 'VALUATION',
    accounting_month_start_day: 1,
    notifications_enabled: true,
  };

  const adminUser: User = {
    id: 'usr_admin_01',
    username: 'admin',
    password_hash: 'hash_admin123',
    full_name: 'محمد مصطفى شكر (المدير)',
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

  return {
    users: [adminUser, userAhmed, userTarek, userSarah],
    partners: [partnerAhmed, partnerTarek, partnerSarah],
    portfolios: [portfolioAhmed, portfolioTarek, portfolioSarah],
    transactions: [],
    deposits: [],
    withdrawals: [],
    withdrawal_requests: [],
    portfolio_valuations: [],
    management_fees: [],
    audit_logs: [],
    notifications: [],
    system_settings: settings,
  };
}
