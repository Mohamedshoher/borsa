import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { reverseTransaction } from '@/lib/financial';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المدير مطلوبة لعكس وتصحيح العمليات المالية' }, { status: 403 });
    }

    const txnId = params.id;
    const body = await req.json();
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'يجب تدوين سبب عكس العملية للتسجيل في سجل التدقيق' }, { status: 400 });
    }

    const result = reverseTransaction(txnId, reason.trim(), user);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      reversalTxn: result.reversalTxn,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
