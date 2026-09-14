import { getDb, saveDatabase } from './db';
import { AuditLog } from './types';

export function recordAuditLog(
  user: { id: string; full_name: string; role: string } | null,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'CALCULATE' | 'APPROVE' | 'REJECT' | 'REVERSE',
  entity_type: 'partner' | 'portfolio' | 'transaction' | 'withdrawal_request' | 'fee' | 'settings' | 'auth',
  entity_id: string | null,
  old_data: any,
  new_data: any,
  ip_address: string = '127.0.0.1'
) {
  try {
    const db = getDb();
    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const log: AuditLog = {
      id,
      user_id: user?.id || 'system',
      user_name: user?.full_name || 'النظام التلقائي',
      user_role: user?.role || 'system',
      action,
      entity_type,
      entity_id,
      old_data,
      new_data,
      ip_address,
      timestamp: now,
    };

    db.audit_logs.unshift(log);
    // Keep max 1000 logs
    if (db.audit_logs.length > 1000) {
      db.audit_logs = db.audit_logs.slice(0, 1000);
    }
    saveDatabase(db);
  } catch (err) {
    console.error('Failed to record audit log:', err);
  }
}
