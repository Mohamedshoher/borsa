'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Send, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Portfolio } from '@/lib/types';

interface WithdrawalReqModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio?: Portfolio | null;
}

export default function WithdrawalRequestModal({
  isOpen,
  onClose,
  portfolio,
}: WithdrawalReqModalProps) {
  const { showToast, triggerRefresh } = useApp();

  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('سحب أرباح استثمارية');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const maxWithdrawable = portfolio?.net_value || 0;
  const parsedAmount = parseFloat(amount) || 0;
  const isOverLimit = parsedAmount > maxWithdrawable;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      showToast('يرجى إدخال مبلغ صحيح للسحب', 'error');
      return;
    }

    if (isOverLimit) {
      showToast('المبلغ المطلوب يتجاوز الرصيد المتاح للسحب في محفظتك', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/withdrawal-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          reason,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل إرسال طلب السحب');
      }

      showToast('تم إرسال طلب السحب بنجاح وهو الآن قيد مراجعة مدير الاستثمار', 'success');
      triggerRefresh();
      onClose();
      setAmount('');
      setNotes('');
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء تقديم الطلب', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">تقديم طلب سحب مالي من المحفظة</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                يتم إرسال الطلب للمدير للمراجعة واعتماد التحويل المالي
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
          {/* Available balance card */}
          <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-blue-700 dark:text-blue-300 block mb-0.5 font-semibold">
                الرصيد الصافي المتاح للسحب
              </span>
              <span className="text-lg font-extrabold text-blue-900 dark:text-blue-100 font-financial">
                {formatCurrency(maxWithdrawable)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAmount(maxWithdrawable.toString())}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-sm"
            >
              سحب كامل الرصيد
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              المبلغ المطلوب سحبه (جنيه مصري) *
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="1"
                max={maxWithdrawable}
                required
                placeholder="أدخل المبلغ..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full pl-12 pr-3.5 py-2.5 rounded-xl border ${
                  isOverLimit
                    ? 'border-rose-500 ring-2 ring-rose-500/20'
                    : 'border-slate-300 dark:border-slate-700'
                } bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-base focus:ring-2 focus:ring-blue-500 focus:outline-none`}
              />
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">ج.م</span>
            </div>
            {isOverLimit && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>المبلغ المطلوب يتجاوز الرصيد المتاح للسحب</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              سبب السحب (اختياري)
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="سحب أرباح استثمارية">سحب أرباح استثمارية</option>
              <option value="سحب جزئي من رأس المال">سحب جزئي من رأس المال</option>
              <option value="احتياج سيولة شخصية">احتياج سيولة شخصية</option>
              <option value="تصفية المحفظة بالكامل">تصفية المحفظة بالكامل</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              بيانات التحويل المطلوب أو ملاحظات للمدير
            </label>
            <textarea
              rows={3}
              placeholder="مثال: يرجى التحويل على محفظة فودافون كاش 01012345678 أو إنستاباي..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
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
              disabled={isSubmitting || parsedAmount <= 0 || isOverLimit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-950/20 transition-all disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال طلب السحب للمدير'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
