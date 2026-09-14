'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Percent, Calculator, CheckCircle, AlertTriangle, Users } from 'lucide-react';
import { formatCurrency, formatPeriodMonth } from '@/lib/utils';
import { Partner, Portfolio, ManagementFee } from '@/lib/types';

interface FeeCalcModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: (Partner & { portfolio?: Portfolio })[];
  existingFees: ManagementFee[];
}

export default function ManagementFeeCalculatorModal({
  isOpen,
  onClose,
  partners,
  existingFees,
}: FeeCalcModalProps) {
  const { showToast, triggerRefresh, systemSettings } = useApp();

  const currentYearMonth = new Date().toISOString().substring(0, 7); // e.g. "2026-09"
  const [periodMonth, setPeriodMonth] = useState(currentYearMonth);
  const [partnerMode, setPartnerMode] = useState<'ALL' | string>('ALL');
  const [usePartnerCustomRate, setUsePartnerCustomRate] = useState(true);
  const [globalFeeRate, setGlobalFeeRate] = useState(systemSettings?.default_mgmt_fee_rate || 2.0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const activePartners = partners.filter((p) => p.status === 'active');
  const targetPartners = partnerMode === 'ALL' ? activePartners : activePartners.filter((p) => p.id === partnerMode);

  // Compute preview and check duplicates
  const previewItems = targetPartners.map((p) => {
    const valuation = p.portfolio?.current_valuation || 0;
    const effectiveRate = usePartnerCustomRate
      ? (p.management_fee_rate !== undefined ? p.management_fee_rate : globalFeeRate)
      : globalFeeRate;

    const feeAmount = Math.round(valuation * (effectiveRate / 100) * 100) / 100;
    const alreadyCalculated = existingFees.some(
      (f) => f.partner_id === p.id && f.period_month === periodMonth && f.fee_type === 'MONTHLY'
    );
    return {
      partner: p,
      valuation,
      effectiveRate,
      feeAmount,
      alreadyCalculated,
    };
  });

  const totalFeePreview = previewItems
    .filter((item) => !item.alreadyCalculated)
    .reduce((sum, item) => sum + item.feeAmount, 0);

  const duplicateCount = previewItems.filter((i) => i.alreadyCalculated).length;
  const eligibleCount = previewItems.filter((i) => !i.alreadyCalculated).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (eligibleCount === 0) {
      showToast('جميع الشركاء المحددين تم احتساب أتعاب هذا الشهر لهم مسبقاً!', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/management-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: partnerMode,
          period_month: periodMonth,
          fee_percentage: usePartnerCustomRate ? undefined : globalFeeRate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل احتساب أتعاب الإدارة');
      }

      showToast(data.message || 'تم احتساب أتعاب الإدارة بنجاح', 'success');
      triggerRefresh();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء احتساب الأتعاب', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
              <Percent className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">احتساب أتعاب الإدارة الشهرية (وفق نسبة كل شريك)</h2>
              <p className="text-xs text-purple-200 mt-0.5">
                تطبيق نسبة الأتعاب المخصصة لكل شريك تلقائياً ومنع التكرار المحاسبي
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                الشهر المحاسبي المستحق *
              </label>
              <input
                type="month"
                required
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <span className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 block font-semibold">
                شهر الاستحقاق: {formatPeriodMonth(periodMonth)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                طريقة تطبيق النسبة
              </label>
              <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 space-y-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
                  <input
                    type="radio"
                    name="rateMode"
                    checked={usePartnerCustomRate}
                    onChange={() => setUsePartnerCustomRate(true)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span>استخدام نسبة كل شريك المخصصة له</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-600 dark:text-slate-400">
                  <input
                    type="radio"
                    name="rateMode"
                    checked={!usePartnerCustomRate}
                    onChange={() => setUsePartnerCustomRate(false)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span>توحيد النسبة على {globalFeeRate}% للجميع</span>
                </label>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                نطاق الاحتساب
              </label>
              <select
                value={partnerMode}
                onChange={(e) => setPartnerMode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="ALL">احتساب جماعي لكافة الشركاء النشطين ({activePartners.length} شريك)</option>
                {activePartners.map((p) => (
                  <option key={p.id} value={p.id}>
                    شريك محدد: {p.full_name} (النسبة: {p.management_fee_rate || 2.0}% | التقييم: {formatCurrency(p.portfolio?.current_valuation)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deduplication & Summary Info */}
          {duplicateCount > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                <span className="font-bold block mb-0.5">تنبيه منع التكرار المحاسبي:</span>
                تم اكتشاف احتساب مسبق لشهر ({formatPeriodMonth(periodMonth)}) لعدد ({duplicateCount}) شريك. سيقوم النظام بتجاوزهم تلقائياً لتفادي تكرار الخصم.
              </div>
            </div>
          )}

          {/* Preview Table with Partner Specific Rates */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                معاينة احتساب الأتعاب وفق نسبة كل شريك ({previewItems.length} شريك)
              </span>
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 font-financial">
                إجمالي الأتعاب المؤهلة: {formatCurrency(totalFeePreview)}
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {previewItems.map((item) => (
                <div
                  key={item.partner.id}
                  className={`px-4 py-2.5 flex items-center justify-between text-xs ${
                    item.alreadyCalculated
                      ? 'bg-slate-50 dark:bg-slate-900/50 opacity-60'
                      : 'hover:bg-purple-50/40 dark:hover:bg-purple-950/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{item.partner.full_name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                      {item.effectiveRate}%
                    </span>
                    <span className="text-slate-400">
                      (التقييم: {formatCurrency(item.valuation)})
                    </span>
                  </div>

                  <div>
                    {item.alreadyCalculated ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        محتسب مسبقاً
                      </span>
                    ) : (
                      <span className="font-bold text-purple-700 dark:text-purple-300 font-financial">
                        +{formatCurrency(item.feeAmount)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
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
              disabled={isSubmitting || eligibleCount === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white text-xs font-bold shadow-md shadow-purple-950/30 transition-all disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'جاري الاحتساب...'
                  : `اعتماد واحتساب أتعاب ${eligibleCount} شريك (${formatCurrency(totalFeePreview)})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
