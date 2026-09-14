import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDatabase } from '@/lib/db';
import { getUserFromRequest, authorizePartnerAccess } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const partnerId = params.id;
    if (!authorizePartnerAccess(user, partnerId)) {
      return NextResponse.json({ error: 'غير مصرح لك بالوصول لبيانات هذا الشريك' }, { status: 403 });
    }

    const db = getDb();
    const partner = db.partners.find((p) => p.id === partnerId);
    if (!partner) {
      return NextResponse.json({ error: 'الشريك غير موجود' }, { status: 404 });
    }

    const portfolio = db.portfolios.find((pf) => pf.partner_id === partnerId);
    const transactions = db.transactions.filter((t) => t.partner_id === partnerId);
    const valuations = db.portfolio_valuations.filter((v) => v.partner_id === partnerId);
    const fees = db.management_fees.filter((f) => f.partner_id === partnerId);
    const requests = db.withdrawal_requests.filter((r) => r.partner_id === partnerId);
    const linkedUser = db.users.find((u) => u.id === partner.user_id);

    return NextResponse.json({
      partner: {
        ...partner,
        management_fee_rate: partner.management_fee_rate || 2.0,
        portfolio,
        username: linkedUser?.username || '',
      },
      transactions,
      valuations,
      fees,
      withdrawal_requests: requests,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المدير مطلوبة لتعديل بيانات الشريك' }, { status: 403 });
    }

    const partnerId = params.id;
    const body = await req.json();
    const db = getDb();

    const pIndex = db.partners.findIndex((p) => p.id === partnerId);
    if (pIndex === -1) {
      return NextResponse.json({ error: 'الشريك غير موجود' }, { status: 404 });
    }

    const oldPartner = { ...db.partners[pIndex] };
    const { full_name, phone, email, notes, status, password, management_fee_rate } = body;

    if (full_name) db.partners[pIndex].full_name = full_name.trim();
    if (phone) db.partners[pIndex].phone = phone.trim();
    if (email !== undefined) db.partners[pIndex].email = email?.trim() || null;
    if (notes !== undefined) db.partners[pIndex].notes = notes?.trim() || null;
    if (status) db.partners[pIndex].status = status;
    if (management_fee_rate !== undefined) {
      const parsedRate = parseFloat(management_fee_rate);
      if (!isNaN(parsedRate) && parsedRate >= 0) {
        db.partners[pIndex].management_fee_rate = parsedRate;
      }
    }

    // If user exists, update user name/status/password
    if (db.partners[pIndex].user_id) {
      const uIndex = db.users.findIndex((u) => u.id === db.partners[pIndex].user_id);
      if (uIndex !== -1) {
        if (full_name) db.users[uIndex].full_name = full_name.trim();
        if (status) db.users[uIndex].status = status;
        if (password) db.users[uIndex].password_hash = `hash_${password}`;
      }
    }

    saveDatabase(db);

    recordAuditLog(
      user,
      'UPDATE',
      'partner',
      partnerId,
      oldPartner,
      db.partners[pIndex]
    );

    return NextResponse.json({
      success: true,
      message: 'تم تحديث بيانات الشريك ونسبة الأتعاب بنجاح',
      partner: db.partners[pIndex],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المدير مطلوبة لحذف الشريك' }, { status: 403 });
    }

    const partnerId = params.id;
    const db = getDb();

    const pIndex = db.partners.findIndex((p) => p.id === partnerId);
    if (pIndex === -1) {
      return NextResponse.json({ error: 'الشريك غير موجود' }, { status: 404 });
    }

    const partnerToDelete = db.partners[pIndex];

    // Remove partner
    db.partners.splice(pIndex, 1);

    // Remove linked user
    if (partnerToDelete.user_id) {
      db.users = db.users.filter((u) => u.id !== partnerToDelete.user_id && u.partner_id !== partnerId);
    } else {
      db.users = db.users.filter((u) => u.partner_id !== partnerId);
    }

    // Remove portfolio
    db.portfolios = db.portfolios.filter((pf) => pf.partner_id !== partnerId);

    // Remove associated records
    db.transactions = db.transactions.filter((t) => t.partner_id !== partnerId);
    db.deposits = db.deposits.filter((d) => d.partner_id !== partnerId);
    db.withdrawals = db.withdrawals.filter((w) => w.partner_id !== partnerId);
    db.withdrawal_requests = db.withdrawal_requests.filter((r) => r.partner_id !== partnerId);
    db.portfolio_valuations = db.portfolio_valuations.filter((v) => v.partner_id !== partnerId);
    db.management_fees = db.management_fees.filter((f) => f.partner_id !== partnerId);
    db.notifications = db.notifications.filter((n) => n.partner_id !== partnerId);

    saveDatabase(db);

    recordAuditLog(
      user,
      'DELETE',
      'partner',
      partnerId,
      partnerToDelete,
      { message: `تم حذف الشريك ${partnerToDelete.full_name} ومحفظته نهائياً` }
    );

    return NextResponse.json({
      success: true,
      message: `تم حذف الشريك (${partnerToDelete.full_name}) وكافة بيانات محفظته بنجاح`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
