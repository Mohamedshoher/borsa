import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { targetUsername } = await req.json();
    if (!targetUsername) {
      return NextResponse.json({ error: 'اسم المستخدم مطلوب' }, { status: 400 });
    }

    const db = getDb();
    const user = db.users.find((u) => u.username.toLowerCase() === targetUsername.trim().toLowerCase());
    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
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

    response.cookies.set('shatiby_session_user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
