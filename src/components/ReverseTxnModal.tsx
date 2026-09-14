'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { X, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCurrency, formatDate, getTransactionTypeLabel } from '@/lib/utils';
import { Transaction } from '@/lib/types';

interface ReverseTxnModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export default function ReverseTxnModal({
  isOpen,
  onClose,
  transaction,
}: ReverseTxnModalProps) {
  const { showToast, triggerRefresh } = useApp();

  const [reason, setReason] = useState('تصحيح قيد محاسبي خاطئ بناءً على مراجعة المحفظة');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !transaction) return null;

  const typeInfo = getTransactionTypeLabel(transaction.type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('يجب كتابة سبب عكس وتصحيح العملية للتسجيل في سجل التدقيق', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/transactions/${transaction.id}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل عكس العملية');
      }

      showToast(data.message || 'تم عكس العملية بنجاح وتسجيل القيد التصحيحي', 'success');
      triggerRefresh();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ في النظام', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-orange-600 to-amber-700 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">عكس وتصحيح حركة مالية</h2>
              <p className="text-[11px] sm:text-xs text-orange-100 mt-0.5">
                إنشاء قيد عكسي مطابق محاسبياً
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
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">رقم الحركة:</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">{transaction.transaction_number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">نوع الحركة:</span>
              <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${typeInfo.bg} ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">مبلغ الحركة:</span>
              <span className="font-bold text-base text-slate-900 dark:text-white font-financial">
                {formatCurrency(transaction.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">تاريخ الحركة:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(transaction.date)}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <span>
              القواعد المحاسبية تمنع حذف القيود. سيتم إنشاء حركة عكسية بقيمة ({formatCurrency(-transaction.amount)}) وتوثيق السبب في Audit Log.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              سبب عكس العملية وتصحيحها *
            </label>
            <textarea
              rows={3}
              required
              placeholder="اكتب سبب الإلغاء أو التصحيح بالتفصيل..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
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
              disabled={isSubmitting || !reason.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md shadow-orange-950/30 transition-all disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري العكس...' : 'تأكيد عكس الحركة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
