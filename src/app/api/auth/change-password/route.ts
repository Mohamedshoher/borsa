import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDatabase } from '@/lib/db';
import { getUserFromRequest, hashPassword, verifyPassword } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'يرجى تسجيل الدخول أولاً' }, { status: 401 });
    }

    const { current_password, new_password } = await req.json();

    if (!new_password || new_password.trim().length < 4) {
      return NextResponse.json({ error: 'كلمة المرور الجديدة يجب أن تكون 4 أحرف أو أرقام على الأقل' }, { status: 400 });
    }

    // Verify current password if provided
    if (current_password && !verifyPassword(current_password, user.password_hash || '')) {
      return NextResponse.json({ error: 'كلمة المرور الحالية غير صحيحة' }, { status: 400 });
    }

    const db = getDb();
    const dbUser = db.users.find((u) => u.id === user.id);
    if (!dbUser) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    const newHash = hashPassword(new_password.trim());
    dbUser.password_hash = newHash;
    saveDatabase(db);

    // Sync to Supabase if configured
    if (isSupabaseConfigured()) {
      const client = getSupabaseServerClient();
      if (client) {
        await client
          .from('users')
          .update({ password_hash: newHash })
          .eq('id', user.id);
      }
    }

    recordAuditLog(user, 'UPDATE', 'auth', user.id, null, { message: 'تم تغيير كلمة المرور بنجاح' });

    return NextResponse.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء تغيير كلمة المرور' }, { status: 500 });
  }
}
