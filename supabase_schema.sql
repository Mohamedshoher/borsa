-- ==============================================================================
-- نظام إدارة محافظ الشركاء في البورصة - مركز الشاطبي
-- Supabase PostgreSQL Database Schema
-- ==============================================================================

-- تفعيل ملحق توليد المعرفات الفريدة UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. جدول المستخدمين (Users & Authentication)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'partner')),
    partner_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول الشركاء (Partners)
CREATE TABLE IF NOT EXISTS partners (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    join_date DATE NOT NULL,
    join_time TEXT,
    management_fee_rate NUMERIC(5,2) NOT NULL DEFAULT 2.00,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    notes TEXT,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول المحافظ الاستثمارية (Portfolios)
CREATE TABLE IF NOT EXISTS portfolios (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    initial_capital NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_deposits NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_withdrawals NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_profits NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_losses NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    current_valuation NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_fees_incurred NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    fees_paid NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    fees_due NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    net_value NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    last_valuation_date DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. جدول سجل القيود المالية المزدوجة (Financial Ledger / Transactions)
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'INITIAL_CAPITAL',
        'DEPOSIT',
        'WITHDRAWAL',
        'VALUATION_PROFIT',
        'VALUATION_LOSS',
        'MANAGEMENT_FEE_INITIAL',
        'MANAGEMENT_FEE_MONTHLY',
        'FEE_PAYMENT',
        'ADJUSTMENT',
        'REVERSAL'
    )),
    amount NUMERIC(15,2) NOT NULL,
    running_balance NUMERIC(15,2) NOT NULL,
    date DATE NOT NULL,
    time TEXT,
    reference_id TEXT,
    description TEXT NOT NULL,
    is_reversible BOOLEAN NOT NULL DEFAULT true,
    is_reversed BOOLEAN NOT NULL DEFAULT false,
    reversed_by_txn_id TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. جدول عمليات الإيداع (Deposits)
CREATE TABLE IF NOT EXISTS deposits (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    amount NUMERIC(15,2) NOT NULL,
    date DATE NOT NULL,
    time TEXT,
    payment_method TEXT NOT NULL,
    reference_number TEXT,
    notes TEXT,
    transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. جدول عمليات السحب المنفذة (Withdrawals)
CREATE TABLE IF NOT EXISTS withdrawals (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    amount NUMERIC(15,2) NOT NULL,
    date DATE NOT NULL,
    time TEXT,
    withdrawal_type TEXT NOT NULL CHECK (withdrawal_type IN ('PARTIAL', 'FULL', 'PROFIT_ONLY', 'CAPITAL_ONLY')),
    payment_method TEXT NOT NULL,
    reference_number TEXT,
    notes TEXT,
    transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
    request_id TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. جدول طلبات السحب المقدمة من الشركاء (Withdrawal Requests)
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    partner_name TEXT NOT NULL,
    portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    requested_amount NUMERIC(15,2) NOT NULL,
    current_net_value NUMERIC(15,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED')),
    request_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    review_date TIMESTAMPTZ,
    reviewed_by TEXT,
    rejection_reason TEXT,
    notes TEXT,
    payment_details TEXT
);

-- 8. جدول التقييمات الدورية وتحديثات القيمة السوقية (Portfolio Valuations)
CREATE TABLE IF NOT EXISTS portfolio_valuations (
    id TEXT PRIMARY KEY,
    portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    partner_name TEXT NOT NULL,
    previous_value NUMERIC(15,2) NOT NULL,
    new_value NUMERIC(15,2) NOT NULL,
    change_amount NUMERIC(15,2) NOT NULL,
    change_percentage NUMERIC(8,4) NOT NULL,
    valuation_date DATE NOT NULL,
    valuation_time TEXT,
    notes TEXT,
    transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. جدول أتعاب إدارة المحافظ (Management Fees)
CREATE TABLE IF NOT EXISTS management_fees (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    partner_name TEXT NOT NULL,
    portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    fee_type TEXT NOT NULL CHECK (fee_type IN ('INITIAL', 'MONTHLY')),
    fee_percentage NUMERIC(5,2) NOT NULL DEFAULT 2.00,
    portfolio_value_at_calc NUMERIC(15,2) NOT NULL,
    fee_amount NUMERIC(15,2) NOT NULL,
    period_month TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'due' CHECK (status IN ('due', 'collected')),
    calculation_date DATE NOT NULL,
    collection_date DATE,
    transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. جدول سجل التدقيق والرقابة (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id TEXT,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT
);

-- 11. جدول الإشعارات (Notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('INFO', 'SUCCESS', 'WARNING', 'ALERT')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action_url TEXT
);

-- 12. جدول إعدادات النظام (System Settings)
CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    system_name TEXT NOT NULL DEFAULT 'منصة إدارة محافظ الشركاء - مركز الشاطبي',
    manager_name TEXT NOT NULL DEFAULT 'محمد مصطفى شكر (مدير الاستثمار)',
    currency TEXT NOT NULL DEFAULT 'EGP',
    currency_symbol TEXT NOT NULL DEFAULT 'ج.م',
    default_mgmt_fee_rate NUMERIC(5,2) NOT NULL DEFAULT 2.00,
    mgmt_fee_basis TEXT NOT NULL DEFAULT 'VALUATION',
    accounting_month_start_day INT NOT NULL DEFAULT 1,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- إنشاء فهارس الأداء العالي (Indexes)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_transactions_partner ON transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_management_fees_period ON management_fees(period_month);
CREATE INDEX IF NOT EXISTS idx_management_fees_partner ON management_fees(partner_id);
CREATE INDEX IF NOT EXISTS idx_valuations_partner ON portfolio_valuations(partner_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- ==============================================================================
-- إدخال البيانات الافتراضية الأولية (Initial Seed Data)
-- ==============================================================================

-- إعدادات النظام
INSERT INTO system_settings (id, system_name, manager_name, currency, currency_symbol, default_mgmt_fee_rate, mgmt_fee_basis, accounting_month_start_day, notifications_enabled)
VALUES ('default', 'منصة إدارة محافظ الشركاء - مركز الشاطبي', 'محمد مصطفى شكر (مدير الاستثمار)', 'EGP', 'ج.م', 2.00, 'VALUATION', 1, true)
ON CONFLICT (id) DO NOTHING;

-- حساب المدير العام
INSERT INTO users (id, username, password_hash, full_name, role, partner_id, status, created_at)
VALUES ('usr_admin_01', 'admin', 'hash_admin123', 'محمد مصطفى شكر (المدير)', 'admin', NULL, 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- شريك 1: أحمد محمود الشناوي
INSERT INTO users (id, username, password_hash, full_name, role, partner_id, status, created_at)
VALUES ('usr_ahmed_01', 'ahmed', 'hash_ahmed123', 'أحمد محمود الشناوي', 'partner', 'prt_ahmed_01', 'active', '2026-06-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO partners (id, full_name, phone, email, join_date, join_time, management_fee_rate, status, notes, user_id, created_at)
VALUES ('prt_ahmed_01', 'أحمد محمود الشناوي', '01012345678', 'ahmed.shennawy@example.com', '2026-06-01', '09:30', 2.00, 'active', 'شريك مستثمر - محفظة أسهم قيادية EGX30', 'usr_ahmed_01', '2026-06-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO portfolios (id, partner_id, initial_capital, total_deposits, total_withdrawals, total_profits, total_losses, current_valuation, total_fees_incurred, fees_paid, fees_due, net_value, last_valuation_date)
VALUES ('port_ahmed_01', 'prt_ahmed_01', 100000, 20000, 0, 15000, 0, 135000, 7100, 4400, 2700, 132300, '2026-08-31')
ON CONFLICT (id) DO NOTHING;

-- شريك 2: م. طارق عبد العزيز
INSERT INTO users (id, username, password_hash, full_name, role, partner_id, status, created_at)
VALUES ('usr_tarek_02', 'tarek', 'hash_tarek123', 'م. طارق عبد العزيز', 'partner', 'prt_tarek_02', 'active', '2026-05-10T10:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO partners (id, full_name, phone, email, join_date, join_time, management_fee_rate, status, notes, user_id, created_at)
VALUES ('prt_tarek_02', 'م. طارق عبد العزيز', '01123456789', 'tarek.aziz@example.com', '2026-05-10', '10:15', 2.00, 'active', 'شريك مستثمر - محفظة متوسطة إلى طويلة الأجل', 'usr_tarek_02', '2026-05-10T10:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO portfolios (id, partner_id, initial_capital, total_deposits, total_withdrawals, total_profits, total_losses, current_valuation, total_fees_incurred, fees_paid, fees_due, net_value, last_valuation_date)
VALUES ('port_tarek_02', 'prt_tarek_02', 250000, 0, 30000, 40000, 0, 260000, 15400, 15400, 0, 260000, '2026-08-31')
ON CONFLICT (id) DO NOTHING;

-- شريك 3: د. سارة إبراهيم
INSERT INTO users (id, username, password_hash, full_name, role, partner_id, status, created_at)
VALUES ('usr_sarah_03', 'sarah', 'hash_sarah123', 'د. سارة إبراهيم', 'partner', 'prt_sarah_03', 'active', '2026-08-01T11:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO partners (id, full_name, phone, email, join_date, join_time, management_fee_rate, status, notes, user_id, created_at)
VALUES ('prt_sarah_03', 'د. سارة إبراهيم', '01234567890', 'sarah.ibrahim@example.com', '2026-08-01', '11:30', 2.00, 'active', 'شريكة مستثمرة - محفظة تنمية رأس مال متوازنة', 'usr_sarah_03', '2026-08-01T11:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO portfolios (id, partner_id, initial_capital, total_deposits, total_withdrawals, total_profits, total_losses, current_valuation, total_fees_incurred, fees_paid, fees_due, net_value, last_valuation_date)
VALUES ('port_sarah_03', 'prt_sarah_03', 50000, 0, 0, 3500, 0, 53500, 1000, 1000, 0, 53500, '2026-09-01')
ON CONFLICT (id) DO NOTHING;

-- شريك 4: كريم
INSERT INTO users (id, username, password_hash, full_name, role, partner_id, status, created_at)
VALUES ('usr_karim_04', 'karim', 'hash_karim123', 'كريم', 'partner', 'prt_karim_04', 'active', '2026-09-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO partners (id, full_name, phone, email, join_date, join_time, management_fee_rate, status, notes, user_id, created_at)
VALUES ('prt_karim_04', 'كريم', '01500000000', 'karim@example.com', '2026-09-01', '09:00', 2.00, 'active', 'شريك مستثمر جديد', 'usr_karim_04', '2026-09-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO portfolios (id, partner_id, initial_capital, total_deposits, total_withdrawals, total_profits, total_losses, current_valuation, total_fees_incurred, fees_paid, fees_due, net_value, last_valuation_date)
VALUES ('port_karim_04', 'prt_karim_04', 80000, 0, 0, 0, 0, 80000, 1600, 1600, 0, 80000, '2026-09-01')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- تعطيل قيود RLS لتسهيل الاتصال والعمل المباشر
-- ==============================================================================
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS partners DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS portfolios DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deposits DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS withdrawal_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS portfolio_valuations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS management_fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_settings DISABLE ROW LEVEL SECURITY;

