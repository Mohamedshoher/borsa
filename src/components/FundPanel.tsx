'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PieChart, ArrowDownToLine, ArrowUpFromLine, Crown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Holder {
  partner_id: string;
  partner_name: string;
  is_manager: boolean;
  management_fee_rate: number;
  units: number;
  ownership_pct: number;
  current_valuation: number;
  invested_value: number;
  idle_value: number;
}

interface FundState {
  total_units: number;
  invested_value: number;
  idle_cash: number;
  total_value: number;
  nav_per_unit: number;
  invested_pct: number;
}

/**
 * Shows the shared portfolio: how much is working vs sitting as cash,
 * each partner's share of it, and (admin) moves money between the two.
 */
export default function FundPanel() {
  const { user, refreshKey, showToast, triggerRefresh } = useApp();
  const isAdmin = user?.role === 'admin';

  const [fund, setFund] = useState<FundState | null>(null);
  const [holders, setHolders] = useState<Holder[]>([]);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/fund?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setFund(d.fund);
          setHolders(d.holders);
        }
      })
      .catch(() => {});
  }, [refreshKey]);

  if (!fund) return null;

  const move = async (direction: 'INVEST' | 'DIVEST') => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      showToast('أدخل مبلغاً صحيحاً', 'warning');
      return;
    }
    try {
      setBusy(true);
      const res = await fetch('/api/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, amount: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشلت العملية');
      showToast(data.message, 'success');
      setAmount('');
      triggerRefresh();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
          <PieChart className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">المحفظة المشتركة</h2>
          <p className="text-[11px] text-slate-400">كل الأموال في محفظة واحدة، ولكل شريك نسبة منها</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="إجمالي المحفظة" value={formatCurrency(fund.total_value)} />
        <Stat label="أموال شغّالة (تربح/تخسر)" value={formatCurrency(fund.invested_value)} tone="emerald" />
        <Stat label="سيولة غير مستثمرة" value={formatCurrency(fund.idle_cash)} tone="amber" />
        <Stat label="سعر الحصة" value={fund.nav_per_unit.toFixed(4)} />
      </div>

      <div>
        <div className="h-2.5 rounded-full bg-amber-200 dark:bg-amber-900/60 overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${fund.invested_pct}%` }} />
        </div>
        <div className="flex justify-between text-[11px] text-slate-500 mt-1">
          <span>مستثمر {fund.invested_pct}%</span>
          <span>سيولة {Math.round((100 - fund.invested_pct) * 100) / 100}%</span>
        </div>
      </div>

      {isAdmin && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="المبلغ"
            className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-financial text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <button
            disabled={busy}
            onClick={() => move('INVEST')}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold"
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            استثمار من السيولة
          </button>
          <button
            disabled={busy}
            onClick={() => move('DIVEST')}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            تحويل من الاستثمار لسيولة
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-3 rounded-r-2xl">الشريك</th>
              <th className="p-3">النسبة من المحفظة</th>
              <th className="p-3">قيمة حصته</th>
              <th className="p-3">الشغّال منها</th>
              <th className="p-3">السيولة منها</th>
              {isAdmin && <th className="p-3 rounded-l-2xl">أتعاب شهرية</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {holders.map((h) => (
              <tr key={h.partner_id}>
                <td className="p-3 font-bold text-slate-900 dark:text-white">
                  <span className="inline-flex items-center gap-1.5">
                    {h.is_manager && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                    {h.partner_name}
                    {h.is_manager && <span className="text-[10px] font-semibold text-amber-600">(المدير)</span>}
                  </span>
                </td>
                <td className="p-3 font-financial font-bold text-emerald-700 dark:text-emerald-400">{h.ownership_pct.toFixed(2)}%</td>
                <td className="p-3 font-financial font-bold">{formatCurrency(h.current_valuation)}</td>
                <td className="p-3 font-financial text-slate-600 dark:text-slate-300">{formatCurrency(h.invested_value)}</td>
                <td className="p-3 font-financial text-slate-600 dark:text-slate-300">{formatCurrency(h.idle_value)}</td>
                {isAdmin && (
                  <td className="p-3 font-financial text-slate-600 dark:text-slate-300">{h.is_manager ? '—' : `${h.management_fee_rate}%`}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'emerald' | 'amber' }) {
  const color =
    tone === 'emerald' ? 'text-emerald-700 dark:text-emerald-400' : tone === 'amber' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-white';
  return (
    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
      <span className="text-[11px] text-slate-500 block mb-0.5">{label}</span>
      <span className={`text-base font-black font-financial ${color}`}>{value}</span>
    </div>
  );
}
