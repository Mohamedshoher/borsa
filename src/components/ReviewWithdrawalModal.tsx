'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { X, CheckCircle, XCircle, DollarSign, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { WithdrawalRequest } from '@/lib/types';

interface ReviewWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: WithdrawalRequest | null;
}

export default function ReviewWithdrawalModal({
  isOpen,
  onClose,
  request,
}: ReviewWithdrawalModalProps) {
  const { showToast, triggerRefresh } = useApp();

  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [approvedAmount, setApprovedAmount] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('تحويل بنكي فوري');
  const [referenceNo, setReferenceNo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (request) {
      setApprovedAmount(request.amount.toString());
      setAdminNotes('');
      setReferenceNo('');
    }
  }, [request]);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/withdrawal-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: request.id,
          action: actionType,
          approved_amount: actionType === 'approve' ? parseFloat(approvedAmount) : null,
          admin_notes: adminNotes.trim(),
          payment_method: paymentMethod,
          reference_no: referenceNo.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشلت معالجة الطلب');
      }

      showToast(
        actionType === 'approve'
          ? `تمت الموافقة على طلب سحب ${request.partner_name} بمبلغ ${formatCurrency(parseFloat(approvedAmount))}`
          : `تم رفض طلب السحب للشريك ${request.partner_name}`,
        actionType === 'approve' ? 'success' : 'info'
      );

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
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">مراجعة طلب السحب</h2>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                الشريك: {request.partner_name}
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
          {/* Request summary box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">المبلغ المطلوب من الشريك:</span>
              <span className="text-base font-bold text-slate-900 dark:text-white font-financial">
                {formatCurrency(request.amount)}
              </span>
            </div>
            {request.reason && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">سبب السحب:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{request.reason}</span>
              </div>
            )}
            {request.notes && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block mb-1">ملاحظات وبيانات التحويل المقدمة:</span>
                <p className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  {request.notes}
                </p>
              </div>
            )}
          </div>

          {/* Action Choice: Approve / Reject Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setActionType('approve')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all ${
                actionType === 'approve'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>موافقة وصرف المبلغ</span>
            </button>

            <button
              type="button"
              onClick={() => setActionType('reject')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all ${
                actionType === 'reject'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <XCircle className="w-4 h-4" />
              <span>رفض الطلب</span>
            </button>
          </div>

          {actionType === 'approve' ? (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  المبلغ المعتمد للصرف (جنيه مصري) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">ج.م</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    طريقة التحويل
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="تحويل بنكي فوري">تحويل بنكي فوري</option>
                    <option value="إنستاباي InstaPay">إنستاباي InstaPay</option>
                    <option value="فودافون كاش / محفظة">فودافون كاش / محفظة</option>
                    <option value="تسليم نقدي">تسليم نقدي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الحوالة / العملية
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: REF-99401"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {actionType === 'approve' ? 'ملاحظات وتوجيهات للشريك (اختياري)' : 'سبب رفض الطلب (يظهر للشريك) *'}
            </label>
            <textarea
              rows={2}
              required={actionType === 'reject'}
              placeholder={actionType === 'approve' ? 'تم تحويل المبلغ لحسابكم بنجاح...' : 'توضيح سبب الرفض...'}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
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
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all ${
                actionType === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/20'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/20'
              }`}
            >
              {actionType === 'approve' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>{isSubmitting ? 'جاري الاعتماد...' : 'اعتماد وصرف السحب'}</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>{isSubmitting ? 'جاري الرفض...' : 'تأكيد رفض الطلب'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
