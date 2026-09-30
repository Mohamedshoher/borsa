'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Calculator, ArrowLeftRight } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Partner, Portfolio } from '@/lib/types';

interface ValuationModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: (Partner & { portfolio?: Portfolio })[];
  initialPartnerId?: string | null;
}

const QUICK_PERCENTS = [-10, -5, -2, 2, 5, 10];

/**
 * Records the result of trading for the WHOLE shared portfolio.
 * The change applies to the money that is working and is split among all
 * partners by their share — nobody is valued separately.
 */
export default function ValuationModal({ isOpen, onClose, partners }: ValuationModalProps) {
  const { showToast, triggerRefresh } = useApp();

  const [invested, setInvested] = useState(0);
  const [idle, setIdle] = useState(0);
  const [newValue, setNewValue] = useState('');
  const [percentInput, setPercentInput] = useState('0');
  const [valDate, setValDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('نتيجة التداول');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetch(`/api/fund?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!d.fund) return;
        setInvested(d.fund.invested_value);
        setIdle(d.fund.idle_cash);
        setNewValue(String(d.fund.invested_value));
        setTotalInput(String(Math.round((d.fund.invested_value + d.fund.idle_cash) * 100) / 100));
        setPercentInput('0');
      })
      .catch(() => showToast('تعذر تحميل بيانات المحفظة', 'error'));
  }, [isOpen]);

  if (!isOpen) return null;

  const round2 = (n: number) => Math.round(n * 100) / 100;

  // Three synced inputs: % change, value of the working money, total value of the portfolio.
  // Idle cash never changes with profit/loss, so total = invested + idle.
  const [totalInput, setTotalInput] = useState('');

  const syncFromInvested = (inv: number) => {
    setNewValue(String(inv));
    setTotalInput(String(round2(inv + idle)));
    setPercentInput(invested > 0 ? String(round2(((inv - invested) / invested) * 100)) : '');
  };

  const onValueChange = (v: string) => {
    setNewValue(v);
    const parsed = parseFloat(v);
    setTotalInput(!isNaN(parsed) ? String(round2(parsed + idle)) : '');
    setPercentInput(!isNaN(parsed) && invested > 0 ? String(round2(((parsed - invested) / invested) * 100)) : '');
  };

  const onTotalChange = (v: string) => {
    setTotalInput(v);
    const parsed = parseFloat(v);
    if (!isNaN(parsed)) syncFromInvested(round2(parsed - idle));
  };

  const onPercentChange = (v: string) => {
    setPercentInput(v);
    const pct = parseFloat(v);
    if (!isNaN(pct)) {
      const inv = round2(invested * (1 + pct / 100));
      setNewValue(String(inv));
      setTotalInput(String(round2(inv + idle)));
    }
  };

  const parsedNew = parseFloat(newValue);
  const change = isNaN(parsedNew) ? 0 : round2(parsedNew - invested);
  const changePct = invested > 0 ? round2((change / invested) * 100) : 0;
  const isProfit = change > 0;
  const isLoss = change < 0;
  const total = invested + idle;

  const holders = partners
    .filter((p) => (p.portfolio?.units || 0) > 0)
    .map((p) => {
      const pct = (p.portfolio?.ownership_pct || 0) / 100;
      return { id: p.id, name: p.full_name, pct: pct * 100, share: round2(change * pct) };
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invested <= 0) {
      showToast('لا توجد أموال مستثمرة. حوّل جزءاً من السيولة للاستثمار أولاً', 'warning');
      return;
    }
    if (isNaN(parsedNew) || parsedNew < 0 || change === 0) {
      showToast('أدخل قيمة أو نسبة تغير صحيحة', 'warning');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/valuations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_invested_value: parsedNew,
          valuation_date: valDate,
          reason,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحديث التقييم');
      showToast(data.message, 'success');
      triggerRefresh();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء التقييم', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">تسجيل ربح / خسارة المحفظة المشتركة</h2>
              <p className="text-[11px] sm:text-xs text-emerald-100 mt-0.5">
                يُوزَّع تلقائياً على كل الشركاء بنسبة حصصهم في الأموال العاملة
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[11px] text-slate-500 block mb-0.5">إجمالي المحفظة</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-financial">{formatCurrency(total)}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block mb-0.5">أموال شغّالة</span>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-financial">{formatCurrency(invested)}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block mb-0.5">سيولة غير مستثمرة</span>
              <span className="text-sm font-bold text-amber-700 dark:text-amber-400 font-financial">{formatCurrency(idle)}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>الأموال الشغّالة فقط تتأثر بالربح والخسارة (السيولة لا تتأثر)</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">نسبة التغير % (ربح + / خسارة -)</label>
                <input
                  type="number"
                  step="0.01"
                  value={percentInput}
                  onChange={(e) => onPercentChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm font-financial focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">القيمة الكلية للمحفظة</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalInput}
                  onChange={(e) => onTotalChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm font-financial focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">قيمة الأموال المستثمرة</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newValue}
                  onChange={(e) => onValueChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm font-financial focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_PERCENTS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => onPercentChange(String(pct))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                    pct > 0
                      ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950'
                      : 'border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950'
                  }`}
                >
                  {pct > 0 ? '+' : ''}
                  {pct}%
                </button>
              ))}
            </div>

            <div
              className={`p-3 rounded-xl text-center text-sm font-black font-financial ${
                isProfit
                  ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                  : isLoss
                  ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {isProfit ? 'ربح' : isLoss ? 'خسارة' : 'لا تغير'}: {formatCurrency(Math.abs(change))} ({formatPercent(changePct)})
            </div>
          </div>

          {holders.length > 0 && change !== 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-500">معاينة توزيع النتيجة على الشركاء</div>
              <table className="w-full text-right text-xs">
                <tbody>
                  {holders.map((h) => (
                    <tr key={h.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3.5 py-2 font-semibold text-slate-800 dark:text-slate-200">{h.name}</td>
                      <td className="px-3.5 py-2 text-slate-500 font-financial">{h.pct.toFixed(2)}%</td>
                      <td className={`px-3.5 py-2 font-bold font-financial ${h.share >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {h.share >= 0 ? '+' : ''}
                        {formatCurrency(h.share)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">التاريخ</label>
              <input
                type="date"
                value={valDate}
                onChange={(e) => setValDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">السبب</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="ملاحظات (اختياري)"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting || change === 0}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-sm font-bold transition-all"
            >
              {isSubmitting ? 'جاري التسجيل...' : 'تأكيد وتوزيع على الشركاء'}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
