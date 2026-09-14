import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المدير مطلوبة لمشاهدة سجل التدقيق' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const entityType = searchParams.get('entity_type');

    const db = getDb();
    let logs = [...db.audit_logs];

    if (action && action !== 'ALL') {
      logs = logs.filter((l) => l.action === action);
    }

    if (entityType && entityType !== 'ALL') {
      logs = logs.filter((l) => l.entity_type === entityType);
    }

    logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return NextResponse.json({ audit_logs: logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
