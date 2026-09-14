'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Coins,
  ArrowDownToLine,
  ArrowUpFromLine,
  PlusCircle,
  RefreshCw,
  Search,
  CheckCircle,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Deposit, Withdrawal, Partner } from '@/lib/types';

export default function DepositsWithdrawalsView() {
  const { user, showToast, triggerRefresh, refreshKey } = useApp();

  const [activeTab, setActiveTab] = useState<'deposits' | 'withdrawals'>('deposits');
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [partnerId, setPartnerId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
  const [paymentMethod, setPaymentMethod] = useState('تحويل بنكي');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [dRes, wRes, pRes] = await Promise.all([
        fetch('/api/deposits'),
        fetch('/api/withdrawals'),
        user?.role === 'admin' ? fetch('/api/partners') : Promise.resolve(null),
      ]);

      if (dRes.ok) {
        const dData = await dRes.json();
        setDeposits(dData.deposits || []);
      }
      if (wRes.ok) {
        const wData = await wRes.json();
        setWithdrawals(wData.withdrawals || []);
      }
      if (pRes && pRes.ok) {
        const pData = await pRes.json();
        const activeOnly = (pData.partners || []).filter((p: Partner) => p.status === 'active');
        setPartners(activeOnly);
        if (activeOnly.length > 0 && !partnerId) {
          setPartnerId(activeOnly[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!partnerId || isNaN(numAmount) || numAmount <= 0) {
      showToast('يرجى اختيار الشريك وإدخال مبلغ صحيح', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const endpoint = activeTab === 'deposits' ? '/api/deposits' : '/api/withdrawals';
      const body: any = {
        partner_id: partnerId,
        amount: numAmount,
        payment_method: paymentMethod,
        reference_no: referenceNo.trim() || null,
        notes: notes.trim() || null,
      };

      if (activeTab === 'deposits') {
        body.deposit_date = date;
        body.deposit_time = time;
      } else {
        body.withdrawal_date = date;
        body.withdrawal_time = time;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشلت العملية');
      }

      showToast(data.message || 'تم تسجيل العملية وتحديث المحفظة بنجاح', 'success');
      triggerRefresh();
      setAmount('');
      setReferenceNo('');
      setNotes('');
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ في التسجيل', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalDep = deposits.reduce((sum, d) => sum + d.amount, 0);
  const totalWith = withdrawals.reduce((sum, w) => sum + w.amount, 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">إدارة الإيداعات والسحوبات المالية</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            تسجيل ومتابعة التدفقات النقدية الداخلة والخارجة من محافظ الشركاء.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-200 dark:bg-slate-800 rounded-2xl">
          <button
            onClick={() => setActiveTab('deposits')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'deposits'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>الإيداعات ({deposits.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'withdrawals'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ArrowUpFromLine className="w-4 h-4" />
            <span>السحوبات ({withdrawals.length})</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-500 block mb-1">إجمالي الإيداعات الإضافية</span>
          <span className="text-xl font-black text-emerald-600 font-financial">{formatCurrency(totalDep)}</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-500 block mb-1">إجمالي السحوبات المنفذة</span>
          <span className="text-xl font-black text-rose-600 font-financial">{formatCurrency(totalWith)}</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-500 block mb-1">صافي التدفق النقدي</span>
          <span className="text-xl font-black text-slate-900 dark:text-white font-financial">
            {formatCurrency(totalDep - totalWith)}
          </span>
        </div>
      </div>

      {/* Admin Registration Form Box */}
      {user?.role === 'admin' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
            <PlusCircle className={`w-4 h-4 ${activeTab === 'deposits' ? 'text-emerald-600' : 'text-rose-600'}`} />
            <span>{activeTab === 'deposits' ? 'تسجيل حركة إيداع جديدة' : 'تسجيل حركة سحب معتمدة'}</span>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الشريك *</label>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">المبلغ (جنيه مصري) *</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="المبلغ..."
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">ج.م</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">طريقة الدفع</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="تحويل بنكي CIB / NBE">تحويل بنكي</option>
                <option value="إنستاباي InstaPay">إنستاباي InstaPay</option>
                <option value="فودافون كاش">فودافون كاش</option>
                <option value="إيداع نقدي">إيداع نقدي</option>
                <option value="شيك بنكي">شيك بنكي</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">رقم الحوالة / المرجع</label>
              <input
                type="text"
                placeholder="REF-12345"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ملاحظات وبيان العملية</label>
              <input
                type="text"
                placeholder="بيان تفصيلي للحركة..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all ${
                  activeTab === 'deposits'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isSubmitting ? 'جاري الحفظ...' : activeTab === 'deposits' ? 'تسجيل الإيداع' : 'تسجيل السحب'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          سجل {activeTab === 'deposits' ? 'الإيداعات' : 'السحوبات'} التفصيلي
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
          </div>
        ) : (activeTab === 'deposits' ? deposits : withdrawals).length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            لا توجد حركات مسجلة حالياً
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5 rounded-r-2xl">الشريك</th>
                  <th className="p-3.5">المبلغ</th>
                  <th className="p-3.5">طريقة الدفع</th>
                  <th className="p-3.5">رقم المرجع / الحوالة</th>
                  <th className="p-3.5">التاريخ والوقت</th>
                  <th className="p-3.5 rounded-l-2xl">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(activeTab === 'deposits' ? deposits : withdrawals).map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{item.partner_name}</td>
                    <td className={`p-3.5 font-bold font-financial text-sm ${activeTab === 'deposits' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {activeTab === 'deposits' ? `+${formatCurrency(item.amount)}` : `-${formatCurrency(item.amount)}`}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">{item.payment_method}</td>
                    <td className="p-3.5 font-mono text-slate-500">{item.reference_no || '-'}</td>
                    <td className="p-3.5 text-slate-500 text-[11px]">
                      {formatDate(item.deposit_date || item.withdrawal_date)} • {item.deposit_time || item.withdrawal_time}
                    </td>
                    <td className="p-3.5 text-slate-500 truncate max-w-xs">{item.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
