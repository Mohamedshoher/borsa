import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDatabase } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    return NextResponse.json({ settings: db.system_settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المدير مطلوبة لتعديل إعدادات النظام' }, { status: 403 });
    }

    const body = await req.json();
    const db = getDb();
    const oldSettings = { ...db.system_settings };

    const {
      system_name,
      manager_name,
      currency,
      currency_symbol,
      default_mgmt_fee_rate,
      mgmt_fee_basis,
      accounting_month_start_day,
      notifications_enabled,
    } = body;

    if (system_name) db.system_settings.system_name = system_name.trim();
    if (manager_name) db.system_settings.manager_name = manager_name.trim();
    if (currency) db.system_settings.currency = currency.trim();
    if (currency_symbol) db.system_settings.currency_symbol = currency_symbol.trim();
    if (default_mgmt_fee_rate !== undefined) db.system_settings.default_mgmt_fee_rate = parseFloat(default_mgmt_fee_rate) || 2.0;
    if (mgmt_fee_basis) db.system_settings.mgmt_fee_basis = mgmt_fee_basis;
    if (accounting_month_start_day !== undefined) db.system_settings.accounting_month_start_day = parseInt(accounting_month_start_day, 10) || 1;
    if (notifications_enabled !== undefined) db.system_settings.notifications_enabled = Boolean(notifications_enabled);

    saveDatabase(db);

    recordAuditLog(
      user,
      'UPDATE',
      'settings',
      'system_settings',
      oldSettings,
      db.system_settings
    );

    return NextResponse.json({
      success: true,
      message: 'تم حفظ إعدادات النظام بنجاح',
      settings: db.system_settings,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
