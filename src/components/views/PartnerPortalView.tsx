'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  Send,
  Calendar,
  Clock,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency, formatPercent, formatDate, getTransactionTypeLabel } from '@/lib/utils';
import { Partner, Portfolio, Transaction, WithdrawalRequest } from '@/lib/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PartnerPortalProps {
  openWithdrawalReqModal: () => void;
}

export default function PartnerPortalView({ openWithdrawalReqModal }: PartnerPortalProps) {
  const { user, setCurrentView, refreshKey } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [partner, setPartner] = useState<(Partner & { portfolio?: Portfolio }) | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);

  useEffect(() => {
    const fetchPartnerData = async () => {
      try {
        setIsLoading(true);
        if (!user?.partner_id) return;

        const [pRes, tRes, rRes] = await Promise.all([
          fetch(`/api/partners/${user.partner_id}`),
          fetch(`/api/transactions?partner_id=${user.partner_id}`),
          fetch('/api/withdrawal-requests'),
        ]);

        if (pRes.ok) {
          const pData = await pRes.json();
          setPartner(pData.partner);
        }
        if (tRes.ok) {
          const tData = await tRes.json();
          setTransactions(tData.transactions || []);
        }
        if (rRes.ok) {
          const rData = await rRes.json();
          setRequests(rData.withdrawal_requests || []);
        }
      } catch (e) {
        console.error('Failed to load partner data:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPartnerData();
  }, [user, refreshKey]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-500">جاري تحميل بيانات محفظتك الاستثمارية...</p>
        </div>
      </div>
    );
  }

  const pf = partner?.portfolio;
  const initialCap = pf?.initial_capital || 0;
  const currentVal = pf?.current_valuation || 0;
  const totalDeposits = pf?.total_deposits || 0;
  const totalWithdrawals = pf?.total_withdrawals || 0;
  const totalProfits = pf?.total_profits || 0;
  const totalLosses = pf?.total_losses || 0;
  const netPl = totalProfits - totalLosses;
  const roi = initialCap > 0 ? (netPl / initialCap) * 100 : 0;
  const feesIncurred = pf?.total_fees_incurred || 0;
  const feesDue = pf?.fees_due || 0;
  const netValue = pf?.net_value || 0;

  // Build chart data from transactions
  let runningBalance = 0;
  const chartData: { date: string; balance: number }[] = [];
  
  // Sort transactions chronological
  const sortedTxns = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  for (const txn of sortedTxns) {
    chartData.push({
      date: formatDate(txn.date),
      balance: txn.balance_after,
    });
  }

  // Fallback if empty
  if (chartData.length === 0) {
    chartData.push({ date: 'بداية الاستثمار', balance: initialCap });
    chartData.push({ date: 'التقييم الحالي', balance: currentVal });
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Welcome Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-emerald-950 via-slate-900 to-slate-900 border border-emerald-800/40 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
              <Wallet className="w-3.5 h-3.5" />
              <span>محفظتك الاستثمارية المستقلة</span>
            </span>
            <h1 className="text-xl sm:text-2xl font-black">مرحباً، {partner?.full_name}</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              تاريخ بداية الاستثمار: {formatDate(partner?.join_date)} | الهاتف: {partner?.phone}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={openWithdrawalReqModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>طلب سحب مالي</span>
            </button>
            <button
              onClick={() => setCurrentView('statement')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>كشف الحساب التفصيلي</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6 Key Financial Metric Cards for Partner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Current Valuation */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">القيمة الحالية للمحفظة</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-financial">
            {formatCurrency(currentVal)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            شاملة كافة الأرباح والإيداعات
          </div>
        </div>

        {/* Card 2: Initial Capital */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">رأس المال الأصلي</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-financial">
            {formatCurrency(initialCap)}
          </div>
          <div className="mt-2 text-[11px] text-teal-600 font-semibold">
            + إيداعات: {formatCurrency(totalDeposits)}
          </div>
        </div>

        {/* Card 3: Net Profit/Loss */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">صافي الأرباح المحققة</span>
            <div className="p-2 rounded-xl bg-green-50 dark:bg-green-950/60 text-green-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl font-black font-financial ${netPl >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
            {formatCurrency(netPl)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            نسبة العائد: <span className="font-bold text-emerald-600">{formatPercent(roi)}</span>
          </div>
        </div>

        {/* Card 4: Net Value after Due Fees */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">صافي القيمة المتاحة</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-financial">
            {formatCurrency(netValue)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            المبلغ المتاح للسحب حالياً
          </div>
        </div>

        {/* Card 5: Management Fees */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">أتعاب الإدارة (2%)</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-purple-700 dark:text-purple-300 font-financial">
            {formatCurrency(feesIncurred)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {feesDue > 0 ? `مستحق: ${formatCurrency(feesDue)}` : 'تم سدادها'}
          </div>
        </div>

        {/* Card 6: Total Withdrawals */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">إجمالي المسحوبات</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600">
              <ArrowUpFromLine className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-rose-600 font-financial">
            {formatCurrency(totalWithdrawals)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            سحوبات مستلمة بالفعل
          </div>
        </div>
      </div>

      {/* Portfolio Growth Chart */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">الرسم البياني لتطور قيمة المحفظة</h3>
            <p className="text-xs text-slate-400 mt-0.5">تتبع نمو رصيد المحفظة مع كل عملية وتقييم دوري</p>
          </div>
        </div>

        <div className="h-72 w-full dir-ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="partnerGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                formatter={(value: any) => [formatCurrency(Number(value)), 'رصيد المحفظة']}
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#partnerGrowth)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Partner's Recent Transactions Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">آخر الحركات المسجلة على محفظتك</h3>
            <p className="text-xs text-slate-400 mt-0.5">سجل الحساب المالي الكامل</p>
          </div>
          <button
            onClick={() => setCurrentView('statement')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-500"
          >
            عرض كشف الحساب الكامل
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3 rounded-r-xl">رقم الحركة</th>
                <th className="p-3">نوع الحركة</th>
                <th className="p-3">المبلغ</th>
                <th className="p-3">الرصيد بعد الحركة</th>
                <th className="p-3">التاريخ والوقت</th>
                <th className="p-3 rounded-l-xl">البيان والتفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.map((txn) => {
                const typeInfo = getTransactionTypeLabel(txn.type);
                return (
                  <tr key={txn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">{txn.transaction_number}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${typeInfo.bg} ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className={`p-3 font-bold font-financial ${txn.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {txn.amount > 0 ? `+${formatCurrency(txn.amount)}` : formatCurrency(txn.amount)}
                    </td>
                    <td className="p-3 font-extrabold font-financial text-slate-800 dark:text-slate-200">
                      {formatCurrency(txn.balance_after)}
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {formatDate(txn.date)} • {txn.time}
                    </td>
                    <td className="p-3 text-slate-400 truncate max-w-sm">{txn.notes || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
