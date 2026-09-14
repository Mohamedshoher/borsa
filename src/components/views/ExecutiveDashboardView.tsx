'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Users,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Percent,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShieldCheck,
  PlusCircle,
  Calculator,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Eye,
  FileText,
} from 'lucide-react';
import { formatCurrency, formatPercent, formatDate, getTransactionTypeLabel } from '@/lib/utils';
import { Partner, Portfolio, Transaction, ManagementFee, WithdrawalRequest } from '@/lib/types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface DashboardProps {
  openAddPartnerModal: () => void;
  openValuationModal: () => void;
  openFeeModal: () => void;
}

export default function ExecutiveDashboardView({
  openAddPartnerModal,
  openValuationModal,
  openFeeModal,
}: DashboardProps) {
  const { setCurrentView, setSelectedPartnerId, refreshKey } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [partners, setPartners] = useState<(Partner & { portfolio?: Portfolio })[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingRequests, setPendingRequests] = useState<WithdrawalRequest[]>([]);
  const [fees, setFees] = useState<ManagementFee[]>([]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [pRes, tRes, rRes, fRes] = await Promise.all([
        fetch('/api/partners'),
        fetch('/api/transactions'),
        fetch('/api/withdrawal-requests'),
        fetch('/api/management-fees'),
      ]);

      if (pRes.ok) {
        const pData = await pRes.json();
        setPartners(pData.partners || []);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setTransactions(tData.transactions || []);
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        const reqs: WithdrawalRequest[] = rData.withdrawal_requests || [];
        setPendingRequests(reqs.filter((r) => r.status === 'pending'));
      }
      if (fRes.ok) {
        const fData = await fRes.json();
        setFees(fData.management_fees || []);
      }
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshKey]);

  // Calculations
  const totalCapital = partners.reduce((sum, p) => sum + (p.portfolio?.initial_capital || 0), 0);
  const totalValuation = partners.reduce((sum, p) => sum + (p.portfolio?.current_valuation || 0), 0);
  const totalProfits = partners.reduce((sum, p) => sum + (p.portfolio?.total_profits || 0), 0);
  const totalLosses = partners.reduce((sum, p) => sum + (p.portfolio?.total_losses || 0), 0);
  const netProfit = totalProfits - totalLosses;
  const overallRoi = totalCapital > 0 ? (netProfit / totalCapital) * 100 : 0;

  const totalFeesIncurred = fees.reduce((sum, f) => sum + f.fee_amount, 0);
  const totalFeesCollected = fees.filter((f) => f.status === 'collected').reduce((sum, f) => sum + f.fee_amount, 0);
  const totalFeesDue = fees.filter((f) => f.status === 'due').reduce((sum, f) => sum + f.fee_amount, 0);

  const totalDeposits = partners.reduce((sum, p) => sum + (p.portfolio?.total_deposits || 0), 0);
  const totalWithdrawals = partners.reduce((sum, p) => sum + (p.portfolio?.total_withdrawals || 0), 0);

  // Distribution chart data
  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6'];
  const pieData = partners.map((p, idx) => ({
    name: p.full_name,
    value: p.portfolio?.current_valuation || 0,
    color: COLORS[idx % COLORS.length],
  }));

  // Timeline chart data from monthly/transactions
  const timelineData = [
    { month: 'مايو 2026', valuation: 250000, capital: 250000, profit: 0 },
    { month: 'يونيو 2026', valuation: 345000, capital: 350000, profit: 0 },
    { month: 'يوليو 2026', valuation: 410000, capital: 370000, profit: 40000 },
    { month: 'أغسطس 2026', valuation: 448500, capital: 400000, profit: 55000 },
    { month: 'سبتمبر 2026', valuation: totalValuation, capital: totalCapital, profit: netProfit },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-500">جاري تحميل البيانات المالية للمحافظ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Banner / Welcome & Quick Actions (3 Clean Lines on Mobile) */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-l from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-4 sm:p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3" />
                <span>لوحة الإدارة التنفيذية</span>
              </span>
            </div>
            <h1 className="text-base sm:text-2xl font-black text-white leading-tight">
              إدارة ومتابعة محافظ الشركاء في البورصة
            </h1>
          </div>

          {/* Quick Action Buttons (Balanced 3-column grid on mobile) */}
          <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex sm:items-center">
            <button
              onClick={openAddPartnerModal}
              className="flex items-center justify-center gap-1.5 py-2 px-2 sm:px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-emerald-950/40 transition-all active:scale-95 text-center"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="truncate">إضافة شريك</span>
            </button>
            <button
              onClick={openValuationModal}
              className="flex items-center justify-center gap-1.5 py-2 px-2 sm:px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] sm:text-xs font-bold border border-slate-700 transition-all active:scale-95 text-center"
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate">تحديث التقييم</span>
            </button>
            <button
              onClick={openFeeModal}
              className="flex items-center justify-center gap-1.5 py-2 px-2 sm:px-4 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-purple-200 text-[11px] sm:text-xs font-bold border border-purple-700/60 transition-all active:scale-95 text-center"
            >
              <Percent className="w-3.5 h-3.5 text-purple-400" />
              <span className="truncate">احتساب الأتعاب</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pending Withdrawal Requests Alert if any */}
      {pendingRequests.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
              {pendingRequests.length}
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                يوجد ({pendingRequests.length}) طلب سحب جديد قيد الانتظار
              </h4>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                يرجى مراجعة طلبات السحب المقدمة من الشركاء للاعتماد أو الرفض.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCurrentView('withdrawal_requests')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors shadow-sm"
          >
            مراجعة الطلبات
          </button>
        </div>
      )}

      {/* Key Financial Metric Cards (6 Cards Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Total Valuation */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي قيمة المحافظ</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white font-financial">
            {formatCurrency(totalValuation)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>عائد إجمالي {formatPercent(overallRoi)}</span>
          </div>
        </div>

        {/* Card 2: Total Capital */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي رأس المال</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white font-financial">
            {formatCurrency(totalCapital)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            عدد الشركاء: {partners.length} شريك
          </div>
        </div>

        {/* Card 3: Net Profit */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">صافي الأرباح المحققة</span>
            <div className="p-2 rounded-xl bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-lg font-black font-financial ${netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-600'}`}>
            {formatCurrency(netProfit)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            أرباح: {formatCurrency(totalProfits)} | خسائر: {formatCurrency(totalLosses)}
          </div>
        </div>

        {/* Card 4: Management Fees Total */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">أتعاب الإدارة (2%)</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-black text-purple-700 dark:text-purple-300 font-financial">
            {formatCurrency(totalFeesIncurred)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span className="text-emerald-600">محصل: {formatCurrency(totalFeesCollected)}</span>
            <span className="text-amber-600">مستحق: {formatCurrency(totalFeesDue)}</span>
          </div>
        </div>

        {/* Card 5: Deposits */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي الإيداعات</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white font-financial">
            {formatCurrency(totalDeposits)}
          </div>
          <div className="mt-2 text-[11px] text-teal-600 font-medium">
            تعزيزات إضافية للمحافظ
          </div>
        </div>

        {/* Card 6: Withdrawals */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي السحوبات</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <ArrowUpFromLine className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white font-financial">
            {formatCurrency(totalWithdrawals)}
          </div>
          <div className="mt-2 text-[11px] text-rose-600 font-medium">
            سحوبات أرباح معتمدة
          </div>
        </div>
      </div>

      {/* Interactive Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth Area Chart (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">تطور ونمو قيمة المحافظ الاستثمارية</h3>
              <p className="text-xs text-slate-400 mt-0.5">مقارنة القيمة السوقية الإجمالية مقابل رأس المال المستثمر</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              نمو مستمر
            </span>
          </div>

          <div className="h-72 w-full dir-ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="valGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="capGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="valuation" name="القيمة الحالية" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#valGradient)" />
                <Area type="monotone" dataKey="capital" name="رأس المال" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#capGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Pie Chart (1 Col) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">توزيع المحافظ بين الشركاء</h3>
            <p className="text-xs text-slate-400 mt-0.5">الحصة النسبية لكل شريك من إجمالي الأموال</p>
          </div>

          <div className="h-56 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), 'القيمة']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[130px]">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white font-financial">
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Partners Summary Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">ملخص محافظ الشركاء المستثمرين</h3>
            <p className="text-xs text-slate-400 mt-0.5">متابعة أرصدة وأرباح وأتعاب كل شريك على حدة</p>
          </div>
          <button
            onClick={() => setCurrentView('partners')}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-500 transition-colors"
          >
            <span>عرض كل تفاصيل الشركاء</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5 rounded-r-2xl">الشريك</th>
                <th className="p-3.5">رأس المال الأصلي</th>
                <th className="p-3.5">الإيداعات / السحوبات</th>
                <th className="p-3.5">القيمة الحالية للمحفظة</th>
                <th className="p-3.5">صافي الأرباح / العائد</th>
                <th className="p-3.5">أتعاب الإدارة (2%)</th>
                <th className="p-3.5">صافي القيمة</th>
                <th className="p-3.5 rounded-l-2xl text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {partners.map((p) => {
                const pf = p.portfolio;
                const netPl = (pf?.total_profits || 0) - (pf?.total_losses || 0);
                const roi = (pf?.initial_capital || 0) > 0 ? (netPl / (pf?.initial_capital || 1)) * 100 : 0;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{p.full_name}</div>
                      <div className="text-[11px] text-slate-400">{p.phone}</div>
                    </td>
                    <td className="p-3.5 font-bold font-financial text-slate-800 dark:text-slate-200">
                      {formatCurrency(pf?.initial_capital)}
                    </td>
                    <td className="p-3.5 text-[11px] text-slate-600 dark:text-slate-300">
                      <div className="text-teal-600 font-semibold">+{formatCurrency(pf?.total_deposits)}</div>
                      <div className="text-rose-600 font-semibold">-{formatCurrency(pf?.total_withdrawals)}</div>
                    </td>
                    <td className="p-3.5 font-black text-sm font-financial text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(pf?.current_valuation)}
                    </td>
                    <td className="p-3.5">
                      <div className={`font-bold font-financial ${netPl >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                        {formatCurrency(netPl)}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400">{formatPercent(roi)}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-purple-700 dark:text-purple-300 font-financial">
                        {formatCurrency(pf?.total_fees_incurred)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {pf?.fees_due ? `مستحق: ${formatCurrency(pf.fees_due)}` : 'خالصة'}
                      </div>
                    </td>
                    <td className="p-3.5 font-extrabold text-slate-900 dark:text-white font-financial">
                      {formatCurrency(pf?.net_value)}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => {
                          setSelectedPartnerId(p.id);
                          setCurrentView('statement');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-600 text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>كشف الحساب</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Ledger Transactions */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">آخر الحركات والقيود المالية المسجلة</h3>
            <p className="text-xs text-slate-400 mt-0.5">سجل التدقيق غير القابل للتعديل المباشر</p>
          </div>
          <button
            onClick={() => setCurrentView('transactions')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-500 flex items-center gap-1"
          >
            <span>سجل العمليات بالكامل</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3 rounded-r-xl">رقم الحركة</th>
                <th className="p-3">الشريك</th>
                <th className="p-3">نوع العملية</th>
                <th className="p-3">المبلغ</th>
                <th className="p-3">الرصيد بعد العملية</th>
                <th className="p-3">التاريخ والوقت</th>
                <th className="p-3 rounded-l-xl">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.slice(0, 5).map((txn) => {
                const typeInfo = getTransactionTypeLabel(txn.type);
                return (
                  <tr key={txn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">{txn.transaction_number}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{txn.partner_name}</td>
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
                    <td className="p-3 text-slate-400 truncate max-w-xs">{txn.notes || '-'}</td>
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
