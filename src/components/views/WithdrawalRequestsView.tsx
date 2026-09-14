'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  ArrowUpFromLine,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  PlusCircle,
  Send,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { WithdrawalRequest } from '@/lib/types';

interface RequestsViewProps {
  openReviewModal: (req: WithdrawalRequest) => void;
  openWithdrawalReqModal: () => void;
}

export default function WithdrawalRequestsView({
  openReviewModal,
  openWithdrawalReqModal,
}: RequestsViewProps) {
  const { user, refreshKey } = useApp();

  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'approved' | 'rejected'>('ALL');

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/withdrawal-requests?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.withdrawal_requests || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [refreshKey]);

  const filtered = requests.filter((r) => statusFilter === 'ALL' || r.status === statusFilter);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">طلبات السحب المالي</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {user?.role === 'admin'
              ? 'مراجعة واعتماد طلبات السحب المقدمة من الشركاء أو رفضها مع بيان السبب.'
              : 'متابعة حالة طلبات السحب المقدمة من جانبكم لمدير الاستثمار.'}
          </p>
        </div>

        {user?.role === 'partner' && (
          <button
            onClick={openWithdrawalReqModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>تقديم طلب سحب جديد</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-fit">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          الكل ({requests.length})
        </button>

        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            statusFilter === 'pending'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-amber-600 hover:text-amber-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>قيد الانتظار ({pendingCount})</span>
        </button>

        <button
          onClick={() => setStatusFilter('approved')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            statusFilter === 'approved'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-emerald-600 hover:text-emerald-700'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>معتمدة ({approvedCount})</span>
        </button>

        <button
          onClick={() => setStatusFilter('rejected')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            statusFilter === 'rejected'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-rose-600 hover:text-rose-700'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>مرفوضة ({rejectedCount})</span>
        </button>
      </div>

      {/* Requests Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            لا توجد طلبات سحب تطابق الفلتر المحدد
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5 rounded-r-2xl">الشريك</th>
                  <th className="p-3.5">المبلغ المطلوب</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5">المبلغ المعتمد</th>
                  <th className="p-3.5">تاريخ ووقت الطلب</th>
                  <th className="p-3.5">سبب السحب وملاحظات الشريك</th>
                  <th className="p-3.5">ملاحظات المدير</th>
                  {user?.role === 'admin' && <th className="p-3.5 rounded-l-2xl text-center">الإجراء</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((req) => {
                  const isPending = req.status === 'pending';
                  const isApproved = req.status === 'approved';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        <div>{req.partner_name}</div>
                        <div className="text-[10px] text-slate-400">{req.partner_phone}</div>
                      </td>
                      <td className="p-3.5 font-black text-sm font-financial text-slate-900 dark:text-white">
                        {formatCurrency(req.amount)}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isPending
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : isApproved
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {isPending && <Clock className="w-3 h-3" />}
                          {isApproved && <CheckCircle className="w-3 h-3" />}
                          {!isPending && !isApproved && <XCircle className="w-3 h-3" />}
                          <span>
                            {isPending ? 'قيد المراجعة' : isApproved ? 'تمت الموافقة والصرف' : 'مرفوض'}
                          </span>
                        </span>
                      </td>
                      <td className="p-3.5 font-bold font-financial text-emerald-600">
                        {req.approved_amount ? formatCurrency(req.approved_amount) : '-'}
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {formatDate(req.request_date)} • {req.request_time}
                      </td>
                      <td className="p-3.5 max-w-xs text-slate-700 dark:text-slate-300">
                        <div className="font-semibold">{req.reason || 'بدون سبب'}</div>
                        {req.notes && <div className="text-[11px] text-slate-400 truncate">{req.notes}</div>}
                      </td>
                      <td className="p-3.5 max-w-xs text-slate-500 text-[11px]">
                        {req.admin_notes || '-'}
                      </td>

                      {user?.role === 'admin' && (
                        <td className="p-3.5 text-center">
                          {isPending ? (
                            <button
                              onClick={() => openReviewModal(req)}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs shadow-sm transition-all"
                            >
                              مراجعة واعتماد
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">مكتمل</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
