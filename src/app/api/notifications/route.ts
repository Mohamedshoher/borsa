import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDatabase } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const db = getDb();
    let notifications = [...db.notifications];

    if (user.role === 'partner') {
      notifications = notifications.filter(
        (n) => n.user_id === user.id || n.partner_id === user.partner_id
      );
    } else {
      // Admin sees notifications assigned to admin or all system
      notifications = notifications.filter(
        (n) => n.user_id === user.id || n.user_id === 'usr_admin_01' || !n.partner_id
      );
    }

    notifications.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const unreadCount = notifications.filter((n) => n.is_read === 0).length;

    return NextResponse.json({ notifications, unread_count: unreadCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Mark notifications as read
export async function PUT(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const body = await req.json();
    const { notification_id, mark_all = false } = body;

    const db = getDb();

    if (mark_all) {
      db.notifications.forEach((n) => {
        if (user.role === 'admin' || n.user_id === user.id || n.partner_id === user.partner_id) {
          n.is_read = 1;
        }
      });
    } else if (notification_id) {
      const notif = db.notifications.find((n) => n.id === notification_id);
      if (notif) notif.is_read = 1;
    }

    saveDatabase(db);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
