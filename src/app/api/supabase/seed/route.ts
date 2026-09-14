import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isSupabaseConfigured, seedSupabaseDatabase } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'غير مصرح لك بتنفيذ هذه العملية (خاص بالإدارة)' }, { status: 403 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            'متغيرات اتصال Supabase غير متوفرة في ملف .env.local (يرجى التأكد من إضافة NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY)',
          configured: false,
        },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = await seedSupabaseDatabase(db);

    if (!result.success) {
      return NextResponse.json({ error: result.error, configured: true }, { status: 500 });
    }

    recordAuditLog(
      user,
      'UPDATE',
      'settings',
      'supabase_cloud',
      null,
      { synced_at: new Date().toISOString(), status: 'synced' }
    );

    return NextResponse.json({
      success: true,
      message: 'تمت مزامنة كافة بيانات المحافظ والشركاء مع قاعدة بيانات Supabase بنجاح!',
    });
  } catch (error: any) {
    console.error('Supabase seed error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء المزامنة' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const configured = isSupabaseConfigured();
    return NextResponse.json({
      configured,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
      message: configured
        ? 'تم العثور على إعدادات اتصال Supabase'
        : 'لم يتم العثور على إعدادات Supabase في ملف .env.local',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
