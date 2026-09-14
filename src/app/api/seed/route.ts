import { NextRequest, NextResponse } from 'next/server';
import { loadDatabase, saveDatabase } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المدير مطلوبة' }, { status: 403 });
    }

    const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
    }

    // Force reload/re-seed
    const newDb = loadDatabase();
    return NextResponse.json({ success: true, message: 'تمت إعادة تهيئة البيانات التجريبية بنجاح' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
