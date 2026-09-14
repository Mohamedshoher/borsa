import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' }, { status: 400 });
    }

    const db = getDb();
    const user = db.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());

    if (!user) {
      return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 });
    }

    if (user.status === 'suspended') {
      return NextResponse.json({ error: 'هذا الحساب موقوف حالياً. يرجى مراجعة إدارة النظام.' }, { status: 403 });
    }

    if (!verifyPassword(password, user.password_hash || '')) {
      return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        partner_id: user.partner_id,
        status: user.status,
      },
    });

    // Set cookie
    response.cookies.set('shatiby_session_user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    recordAuditLog(user, 'LOGIN', 'auth', user.id, null, { username: user.username });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
