import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseSchema } from './db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

// Flag to check if credentials are provided
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.startsWith('http') &&
    supabaseAnonKey &&
    supabaseAnonKey.length > 10
  );
};

// Client-side singleton Supabase client
let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
}

// Server-side Supabase client (can use service role for elevated permissions if available)
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Uploads/syncs the full database payload to Supabase tables
 */
export async function seedSupabaseDatabase(db: DatabaseSchema): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseServerClient();
  if (!client) {
    return { success: false, error: 'بيانات اتصال Supabase غير متوفرة في متغيرات البيئة' };
  }

  try {
    // 1. Settings
    if (db.system_settings) {
      await client.from('system_settings').upsert([
        {
          id: 'default',
          system_name: db.system_settings.system_name,
          manager_name: db.system_settings.manager_name,
          currency: db.system_settings.currency,
          currency_symbol: db.system_settings.currency_symbol,
          default_mgmt_fee_rate: db.system_settings.default_mgmt_fee_rate,
          mgmt_fee_basis: db.system_settings.mgmt_fee_basis,
          accounting_month_start_day: db.system_settings.accounting_month_start_day,
          notifications_enabled: db.system_settings.notifications_enabled,
        },
      ]);
    }

    // 2. Users
    if (db.users?.length) {
      await client.from('users').upsert(db.users);
    }

    // 3. Partners
    if (db.partners?.length) {
      await client.from('partners').upsert(db.partners);
    }

    // 4. Portfolios
    if (db.portfolios?.length) {
      await client.from('portfolios').upsert(db.portfolios);
    }

    // 5. Transactions
    if (db.transactions?.length) {
      await client.from('transactions').upsert(db.transactions);
    }

    // 6. Deposits
    if (db.deposits?.length) {
      await client.from('deposits').upsert(db.deposits);
    }

    // 7. Withdrawals
    if (db.withdrawals?.length) {
      await client.from('withdrawals').upsert(db.withdrawals);
    }

    // 8. Withdrawal Requests
    if (db.withdrawal_requests?.length) {
      await client.from('withdrawal_requests').upsert(db.withdrawal_requests);
    }

    // 9. Portfolio Valuations
    if (db.portfolio_valuations?.length) {
      await client.from('portfolio_valuations').upsert(db.portfolio_valuations);
    }

    // 10. Management Fees
    if (db.management_fees?.length) {
      await client.from('management_fees').upsert(db.management_fees);
    }

    // 11. Audit Logs
    if (db.audit_logs?.length) {
      await client.from('audit_logs').upsert(db.audit_logs);
    }

    // 12. Notifications
    if (db.notifications?.length) {
      await client.from('notifications').upsert(db.notifications);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to seed Supabase database:', err);
    return { success: false, error: err.message || 'فشلت عملية المزامنة مع Supabase' };
  }
}
