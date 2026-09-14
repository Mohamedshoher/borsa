'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { X, TrendingUp, TrendingDown, DollarSign, Calculator, CheckCircle, Percent, ArrowLeftRight } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Partner, Portfolio } from '@/lib/types';

interface ValuationModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: (Partner & { portfolio?: Portfolio })[];
  initialPartnerId?: string | null;
}

export default function ValuationModal({
  isOpen,
  onClose,
  partners,
  initialPartnerId,
}: ValuationModalProps) {
  const { showToast, triggerRefresh } = useApp();

  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [newValuation, setNewValuation] = useState<string>('');
  const [percentInput, setPercentInput] = useState<string>('');
  const [valDate, setValDate] = useState(new Date().toISOString().split('T')[0]);
  const [valTime, setValTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
  const [reason, setReason] = useState('أرباح تداول دورية وإغلاق مراكز مالية');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialPartnerId) {
      setSelectedPartnerId(initialPartnerId);
    } else if (partners.length > 0 && !selectedPartnerId) {
      setSelectedPartnerId(partners[0].id);
    }
  }, [initialPartnerId, partners, selectedPartnerId]);

  const selectedPartner = partners.find((p) => p.id === selectedPartnerId);
  const currentValuation = selectedPartner?.portfolio?.current_valuation || 0;

  useEffect(() => {
    if (selectedPartner?.portfolio) {
      setNewValuation(selectedPartner.portfolio.current_valuation.toString());
      setPercentInput('0');
    }
  }, [selectedPartnerId]);

  if (!isOpen) return null;

  // Handle Value change -> updates percentage
  const handleValuationChange = (valStr: string) => {
    setNewValuation(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && currentValuation > 0) {
      const p = ((parsed - currentValuation) / currentValuation) * 100;
      setPercentInput((Math.round(p * 100) / 100).toString());
    } else {
      setPercentInput('');
    }
  };

  // Handle Percentage change -> updates value
  const handlePercentChange = (pctStr: string) => {
    setPercentInput(pctStr);
    const parsedPct = parseFloat(pctStr);
    if (!isNaN(parsedPct) && currentValuation >= 0) {
      const computedValue = currentValuation * (1 + parsedPct / 100);
      setNewValuation((Math.round(computedValue * 100) / 100).toString());
    }
  };

  // Quick percent button handler
  const applyQuickPercent = (pct: number) => {
    setPercentInput(pct.toString());
    const computedValue = currentValuation * (1 + pct / 100);
    setNewValuation((Math.round(computedValue * 100) / 100).toString());
  };

  const parsedNewVal = parseFloat(newValuation) || 0;
  const changeAmount = Math.round((parsedNewVal - currentValuation) * 100) / 100;
  const changePercent = currentValuation > 0 ? Math.round((changeAmount / currentValuation) * 10000) / 100 : 0;
  const isProfit = changeAmount > 0;
  const isLoss = changeAmount < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartnerId || parsedNewVal < 0) {
      showToast('يرجى اختيار الشريك وإدخال قيمة أو نسبة صحيحة', 'error');
      return;
    }

    if (changeAmount === 0) {
      showToast('القيمة المدخلة مطابقة للقيمة الحالية، لا يوجد تغير لتسجيله', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/valuations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: selectedPartnerId,
          new_valuation: parsedNewVal,
          valuation_date: valDate,
          valuation_time: valTime,
          reason,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تحديث التقييم');
      }

      showToast(
        `تم تحديث قيمة محفظة ${selectedPartner?.full_name} بنسبة ${formatPercent(changePercent)} (${isProfit ? 'أرباح' : 'خسائر'}: ${formatCurrency(Math.abs(changeAmount))})`,
        'success'
      );
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
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">تحديث تقييم المحفظة (بالقيمة أو النسبة)</h2>
              <p className="text-[11px] sm:text-xs text-emerald-100 mt-0.5">
                إدخال نسبة التغير أو القيمة السوقية الجديدة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body with Internal Smooth Scrolling */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              اختر الشريك *
            </label>
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} (القيمة الحالية: {formatCurrency(p.portfolio?.current_valuation)})
                </option>
              ))}
            </select>
          </div>

          {/* Current vs Initial Stats Box */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[11px] text-slate-500 block mb-0.5">القيمة السابقة المسجلة</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-financial">
                {formatCurrency(currentValuation)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block mb-0.5">رأس المال الأصلي</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-financial">
                {formatCurrency(selectedPartner?.portfolio?.initial_capital)}
              </span>
            </div>
          </div>

          {/* Dual Inputs: Percentage % AND New Value (Synced Bidirectionally) */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
                <span>إدخال التقييم (تعديل متزامن)</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. Percentage Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نسبة التغير % (ربح + / خسارة -)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="مثال: 5 أو -3"
                    value={percentInput}
                    onChange={(e) => handlePercentChange(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-financial"
                  />
                  <Percent className="w-4 h-4 absolute left-2.5 top-3 text-emerald-600" />
                </div>
              </div>

              {/* 2. Market Value Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  القيمة السوقية الجديدة (ج.م) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="القيمة الجديدة..."
                    value={newValuation}
                    onChange={(e) => handleValuationChange(e.target.value)}
                    className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-financial"
                  />
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">ج.م</span>
                </div>
              </div>
            </div>

            {/* Quick Percentage Chips */}
            <div>
              <span className="text-[11px] text-slate-500 block mb-1.5 font-medium">نسب سريعة جاهزة:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[1, 2.5, 5, 7.5, 10, 15].map((pct) => (
                  <button
                    key={`plus-${pct}`}
                    type="button"
                    onClick={() => applyQuickPercent(pct)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold transition-colors font-financial"
                  >
                    +{pct}%
                  </button>
                ))}
                {[-1, -2.5, -5, -10].map((pct) => (
                  <button
                    key={`minus-${pct}`}
                    type="button"
                    onClick={() => applyQuickPercent(pct)}
                    className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 text-rose-800 dark:text-rose-200 text-[11px] font-bold transition-colors font-financial"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Real-time Result Summary Box */}
          {changeAmount !== 0 && (
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between ${
                isProfit
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100'
              }`}
            >
              <div className="flex items-center gap-3">
                {isProfit ? (
                  <div className="p-2 rounded-xl bg-emerald-600 text-white">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-rose-600 text-white">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <span className="text-xs font-bold block">
                    {isProfit ? 'صافي أرباح محققة' : 'صافي خسائر مسجلة'}
                  </span>
                  <span className="text-base font-extrabold font-financial">
                    {formatCurrency(Math.abs(changeAmount))}
                  </span>
                </div>
              </div>
              <div className="text-left">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">نسبة التغير الفعلية</span>
                <span
                  className={`text-sm font-bold font-financial ${
                    isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatPercent(changePercent)}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                تاريخ التقييم *
              </label>
              <input
                type="date"
                required
                value={valDate}
                onChange={(e) => setValDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                وقت التقييم *
              </label>
              <input
                type="time"
                required
                value={valTime}
                onChange={(e) => setValTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              سبب التعديل / تفاصيل الصفقات
            </label>
            <input
              type="text"
              placeholder="مثال: أرباح صفقات تداول في أسهم البنوك"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ملاحظات إضافية
            </label>
            <textarea
              rows={2}
              placeholder="ملاحظات محاسبية للمراجعة..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || changeAmount === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition-all disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري التقييم...' : 'اعتماد وتوثيق التقييم'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
