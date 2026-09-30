import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDatabase } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { recordTransaction, recalculatePortfolio, contributeToFund } from '@/lib/financial';
import { recordAuditLog } from '@/lib/audit';
import { Partner, Portfolio, User } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: list all partners (for admin) or single partner (for partner)
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح بالدخول' }, { status: 401 });
    }

    const db = getDb();

    if (user.role === 'partner') {
      const partner = db.partners.find((p) => p.id === user.partner_id);
      if (!partner) {
        return NextResponse.json({ error: 'بيانات الشريك غير موجودة' }, { status: 404 });
      }
      const portfolio = db.portfolios.find((pf) => pf.partner_id === partner.id);
      return NextResponse.json(
        { partners: [{ ...partner, portfolio }] },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    // Admin: see all partners joined with their portfolios and users
    const partnersWithDetails = db.partners.map((p) => {
      const portfolio = db.portfolios.find((pf) => pf.partner_id === p.id);
      const linkedUser = db.users.find((u) => u.id === p.user_id);
      return {
        ...p,
        management_fee_rate: p.management_fee_rate ?? 1.0,
        portfolio,
        username: linkedUser?.username || '',
      };
    });

    return NextResponse.json(
      { partners: partnersWithDetails },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add new partner (Admin only)
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المدير مطلوبة لإضافة شريك' }, { status: 403 });
    }

    const body = await req.json();
    const {
      full_name,
      phone,
      email,
      initial_capital,
      join_date,
      join_time,
      username,
      password,
      notes,
      payment_method,
      management_fee_rate,
      invest_now = true,
    } = body;

    if (!full_name || !phone || !initial_capital || !join_date || !username || !password) {
      return NextResponse.json({ error: 'جميع الحقول الأساسية مطلوبة (الاسم، الهاتف، رأس المال، التاريخ، اسم المستخدم، كلمة المرور)' }, { status: 400 });
    }

    const capital = parseFloat(initial_capital);
    if (isNaN(capital) || capital <= 0) {
      return NextResponse.json({ error: 'مبلغ الاستثمار يجب أن يكون أكبر من الصفر' }, { status: 400 });
    }

    const db = getDb();
    const partnerFeeRate = management_fee_rate !== undefined && management_fee_rate !== '' ? parseFloat(management_fee_rate) : (db.system_settings.default_mgmt_fee_rate ?? 1);
    if (isNaN(partnerFeeRate) || partnerFeeRate < 0) {
      return NextResponse.json({ error: 'نسبة الأتعاب الشهرية غير صحيحة' }, { status: 400 });
    }

    // Check if username already taken
    const existingUser = db.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    if (existingUser) {
      return NextResponse.json({ error: 'اسم المستخدم مسجل مسبقاً، يرجى اختيار اسم آخر' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const partnerId = `prt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const portfolioId = `port_${partnerId}`;
    const dateStr = join_date;
    const timeStr = join_time || '10:00';

    // 1. Create User
    const newUser: User = {
      id: userId,
      username: username.trim().toLowerCase(),
      password_hash: `hash_${password}`,
      full_name: full_name.trim(),
      role: 'partner',
      partner_id: partnerId,
      status: 'active',
      created_at: now,
    };
    db.users.push(newUser);

    // 2. Create Partner
    const newPartner: Partner = {
      id: partnerId,
      full_name: full_name.trim(),
      phone: phone.trim(),
      email: email?.trim() || null,
      join_date: dateStr,
      join_time: timeStr,
      management_fee_rate: partnerFeeRate,
      status: 'active',
      notes: notes?.trim() || null,
      user_id: userId,
      created_at: now,
    };
    db.partners.push(newPartner);

    // 3. Create Portfolio: the partner buys units of the shared fund at the current unit price
    const newPortfolio: Portfolio = {
      id: portfolioId,
      partner_id: partnerId,
      initial_capital: capital,
      total_deposits: 0,
      total_withdrawals: 0,
      total_profits: 0,
      total_losses: 0,
      current_valuation: 0,
      total_fees_incurred: 0,
      fees_paid: 0,
      fees_due: 0,
      net_value: 0,
      units: 0,
      last_valuation_date: dateStr,
      updated_at: now,
    };
    db.portfolios.push(newPortfolio);
    const { units } = contributeToFund(db, partnerId, capital, Boolean(invest_now));
    saveDatabase(db);

    // 4. Record Initial Investment Transaction
    recordTransaction({
      partnerId,
      portfolioId,
      type: 'INITIAL_INVESTMENT',
      amount: capital,
      date: dateStr,
      time: timeStr,
      balanceBefore: 0,
      balanceAfter: capital,
      createdById: user.id,
      units,
      paymentMethod: payment_method || 'تحويل بنكي / نقدي',
      notes: notes || 'رأس المال الابتدائي لبداية الاستثمار في البورصة',
    });

    // Recalculate
    recalculatePortfolio(partnerId);

    // Record Audit
    recordAuditLog(
      user,
      'CREATE',
      'partner',
      partnerId,
      null,
      { full_name, phone, initial_capital: capital, username, management_fee_rate: partnerFeeRate }
    );

    // Add notification
    db.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: user.id,
      partner_id: partnerId,
      title: 'تم تسجيل شريك جديد بنجاح',
      message: `تم إنشاء محفظة الشريك ${full_name} برأس مال ${capital} ج.م وبنسبة أتعاب شهرية ${partnerFeeRate}%.`,
      type: 'SUCCESS',
      is_read: 0,
      created_at: now,
    });
    saveDatabase(db);

    return NextResponse.json({
      success: true,
      message: 'تم إضافة الشريك وإنشاء المحفظة والحساب بنجاح',
      partner: newPartner,
      portfolio: newPortfolio,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
