'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Percent,
  Calculator,
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatDate, formatPeriodMonth } from '@/lib/utils';
import { ManagementFee, Partner, Portfolio } from '@/lib/types';

interface ManagementFeesViewProps {
  openFeeModal: () => void;
}

export default function ManagementFeesView({ openFeeModal }: ManagementFeesViewProps) {
  const { user, showToast, triggerRefresh, refreshKey } = useApp();

  const [fees, setFees] = useState<ManagementFee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'due' | 'collected'>('ALL');
  const [periodFilter, setPeriodFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFees = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/management-fees');
      if (res.ok) {
        const data = await res.json();
        setFees(data.management_fees || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, [refreshKey]);

  const markFeeCollected = async (feeId: string) => {
    try {
      const res = await fetch('/api/management-fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fee_id: feeId,
          status: 'collected',
          collection_date: new Date().toISOString().split('T')[0],
        }),
      });
      if (res.ok) {
        showToast('تم تحصيل الأتعاب وتحديث رصيد المحفظة بنجاح', 'success');
        triggerRefresh();
      }
    } catch (e) {
      showToast('فشل تحديث حالة الأتعاب', 'error');
    }
  };

  // Extract distinct available periods sorted chronologically descending
  const availablePeriods = Array.from(new Set(fees.map((f) => f.period_month))).sort((a, b) => {
    if (a === 'INITIAL') return 1;
    if (b === 'INITIAL') return -1;
    return b.localeCompare(a);
  });

  // Filtered by Period, Status, and Search
  const filtered = fees.filter((f) => {
    const matchesPeriod = periodFilter === 'ALL' || f.period_month === periodFilter;
    const matchesStatus = statusFilter === 'ALL' || f.status === statusFilter;
    const matchesSearch =
      f.partner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatPeriodMonth(f.period_month).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPeriod && matchesStatus && matchesSearch;
  });

  // Calculations for current period filter
  const feesForPeriodStats = fees.filter((f) => periodFilter === 'ALL' || f.period_month === periodFilter);
  const totalIncurred = feesForPeriodStats.reduce((sum, f) => sum + f.fee_amount, 0);
  const totalCollected = feesForPeriodStats.filter((f) => f.status === 'collected').reduce((sum, f) => sum + f.fee_amount, 0);
  const totalDue = feesForPeriodStats.filter((f) => f.status === 'due').reduce((sum, f) => sum + f.fee_amount, 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">أتعاب إدارة المحفظة (2%)</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            متابعة واحتساب أتعاب الإدارة لكل شهر على حدة وتتبع المستحق والمحصل بدقة.
          </p>
        </div>

        {user?.role === 'admin' && (
          <button
            onClick={openFeeModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white text-xs font-bold shadow-lg shadow-purple-950/30 transition-all active:scale-95"
          >
            <Calculator className="w-4 h-4" />
            <span>احتساب أتعاب شهر جديد</span>
          </button>
        )}
      </div>

      {/* Month / Period Filter Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-900/40 via-slate-900 to-slate-900 border border-purple-800/40 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-900/50">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-purple-300 font-bold block">فلترة وتحديد الشهر المحاسبي:</span>
            <span className="text-sm font-black text-white">
              {periodFilter === 'ALL'
                ? 'عرض إجمالي كافة الشهور والفترات'
                : periodFilter === 'INITIAL'
                ? 'أتعاب بداية الاستثمار (الدفعة الأولى)'
                : `أتعاب شهر: ${formatPeriodMonth(periodFilter)}`}
            </span>
          </div>
        </div>

        {/* Month Selector Buttons & Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPeriodFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              periodFilter === 'ALL'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40 ring-2 ring-purple-400'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            كافة الشهور ({fees.length})
          </button>

          {availablePeriods.slice(0, 5).map((period) => {
            const periodCount = fees.filter((f) => f.period_month === period).length;
            return (
              <button
                key={period}
                onClick={() => setPeriodFilter(period)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  periodFilter === period
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40 ring-2 ring-purple-400'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <span>{period === 'INITIAL' ? 'بداية الاستثمار' : formatPeriodMonth(period)}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-purple-200">
                  {periodCount}
                </span>
              </button>
            );
          })}

          {/* Quick Select Dropdown for all periods */}
          {availablePeriods.length > 5 && (
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="ALL">المزيد من الشهور...</option>
              {availablePeriods.map((period) => (
                <option key={period} value={period}>
                  {period === 'INITIAL' ? 'بداية الاستثمار' : formatPeriodMonth(period)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 3 Metric Cards for Selected Month */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500">
              {periodFilter === 'ALL' ? 'إجمالي أتعاب كافة الفترات' : `إجمالي أتعاب (${formatPeriodMonth(periodFilter)})`}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
              {feesForPeriodStats.length} حركة
            </span>
          </div>
          <span className="text-xl font-black text-purple-700 dark:text-purple-300 font-financial">
            {formatCurrency(totalIncurred)}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            {periodFilter === 'ALL' ? 'مجموع كافة الأتعاب المسجلة' : 'المبلغ المستحق عن هذا الشهر'}
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-500 block mb-1">
            {periodFilter === 'ALL' ? 'المحصل بالكامل' : `المحصل لشهر (${formatPeriodMonth(periodFilter)})`}
          </span>
          <span className="text-xl font-black text-emerald-600 font-financial">
            {formatCurrency(totalCollected)}
          </span>
          <span className="text-[11px] text-emerald-600 block mt-1">تمت تسويتها واستلامها</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-500 block mb-1">
            {periodFilter === 'ALL' ? 'المعلق / المستحق الإجمالي' : `المستحق لشهر (${formatPeriodMonth(periodFilter)})`}
          </span>
          <span className="text-xl font-black text-amber-600 font-financial">
            {formatCurrency(totalDue)}
          </span>
          <span className="text-[11px] text-amber-600 block mt-1">قيد التحصيل أو مخصومة من الصافي</span>
        </div>
      </div>

      {/* Filter Bar (Search & Status) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="بحث باسم الشريك..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>

        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            الكل ({feesForPeriodStats.length})
          </button>
          <button
            onClick={() => setStatusFilter('due')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'due'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-amber-600'
            }`}
          >
            مستحقة ({feesForPeriodStats.filter((f) => f.status === 'due').length})
          </button>
          <button
            onClick={() => setStatusFilter('collected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'collected'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-600'
            }`}
          >
            محصلة ({feesForPeriodStats.filter((f) => f.status === 'collected').length})
          </button>
        </div>
      </div>

      {/* Fees Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            جدول أتعاب الإدارة {periodFilter !== 'ALL' ? `(شهر ${formatPeriodMonth(periodFilter)})` : ''}
          </h3>
          <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
            عدد السجلات: {filtered.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="w-6 h-6 text-purple-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            لا توجد أتعاب مسجلة لهذا الشهر أو تطابق شروط البحث
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5 rounded-r-2xl">الشريك</th>
                  <th className="p-3.5">الشهر المحاسبي</th>
                  <th className="p-3.5">قيمة المحفظة عند الاحتساب</th>
                  <th className="p-3.5">نسبة الشريك</th>
                  <th className="p-3.5">قيمة الأتعاب (ج.م)</th>
                  <th className="p-3.5">حالة الأتعاب</th>
                  <th className="p-3.5">تاريخ الاستحقاق</th>
                  <th className="p-3.5">تاريخ التحصيل</th>
                  {user?.role === 'admin' && <th className="p-3.5 rounded-l-2xl text-center">إجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((fee) => {
                  const isCollected = fee.status === 'collected';
                  return (
                    <tr key={fee.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">{fee.partner_name}</td>
                      <td className="p-3.5 font-bold text-purple-700 dark:text-purple-300">
                        {fee.fee_type === 'INITIAL'
                          ? 'أتعاب بداية الاستثمار'
                          : formatPeriodMonth(fee.period_month)}
                      </td>
                      <td className="p-3.5 font-financial font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(fee.portfolio_value_at_calc)}
                      </td>
                      <td className="p-3.5 font-bold text-slate-600 dark:text-slate-300">{fee.fee_percentage}%</td>
                      <td className="p-3.5 font-black text-sm font-financial text-purple-700 dark:text-purple-300">
                        {formatCurrency(fee.fee_amount)}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isCollected
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {isCollected ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          <span>{isCollected ? 'محصلة' : 'مستحقة'}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">{formatDate(fee.calculation_date)}</td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {fee.collection_date ? formatDate(fee.collection_date) : '-'}
                      </td>

                      {user?.role === 'admin' && (
                        <td className="p-3.5 text-center">
                          {!isCollected ? (
                            <button
                              onClick={() => markFeeCollected(fee.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all"
                            >
                              تسجيل التحصيل
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">تم السداد</span>
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
