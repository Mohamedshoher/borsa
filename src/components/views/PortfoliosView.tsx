'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Briefcase,
  Calculator,
  TrendingUp,
  TrendingDown,
  Percent,
  RefreshCw,
  Search,
  FileText,
  Clock,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils';
import { Portfolio, PortfolioValuation } from '@/lib/types';

interface PortfoliosViewProps {
  openValuationModal: (partnerId?: string) => void;
}

export default function PortfoliosView({ openValuationModal }: PortfoliosViewProps) {
  const { setCurrentView, setSelectedPartnerId, refreshKey } = useApp();

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [valuations, setValuations] = useState<PortfolioValuation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [pRes, vRes] = await Promise.all([
        fetch('/api/portfolios'),
        fetch('/api/valuations'),
      ]);

      if (pRes.ok) {
        const pData = await pRes.json();
        setPortfolios(pData.portfolios || []);
      }
      if (vRes.ok) {
        const vData = await vRes.json();
        setValuations(vData.valuations || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const filteredPortfolios = portfolios.filter(
    (p) =>
      p.partner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.partner_phone?.includes(searchQuery)
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">المحافظ الاستثمارية</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            متابعة القيمة السوقية، نسب الربحية، الأتعاب المحتسبة، وتحديث التقييم الدوري.
          </p>
        </div>

        <button
          onClick={() => openValuationModal()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/20 transition-all active:scale-95"
        >
          <Calculator className="w-4 h-4" />
          <span>تحديث تقييم محفظة</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="بحث باسم الشريك أو رقم الهاتف..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-slate-900 dark:text-white text-xs focus:outline-none"
        />
      </div>

      {/* Master Portfolios Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5 rounded-r-2xl">الشريك</th>
                <th className="p-3.5">رأس المال الأصلي</th>
                <th className="p-3.5">الإيداعات / السحوبات</th>
                <th className="p-3.5">القيمة الحالية للمحفظة</th>
                <th className="p-3.5">صافي الأرباح المحققة</th>
                <th className="p-3.5">أتعاب الإدارة (2%)</th>
                <th className="p-3.5">صافي القيمة المتاحة</th>
                <th className="p-3.5">آخر تقييم</th>
                <th className="p-3.5 rounded-l-2xl text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPortfolios.map((pf) => {
                const netPl = pf.total_profits - pf.total_losses;
                const roi = pf.initial_capital > 0 ? (netPl / pf.initial_capital) * 100 : 0;
                return (
                  <tr key={pf.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{pf.partner_name}</div>
                      <div className="text-[11px] text-slate-400">{pf.partner_phone}</div>
                    </td>
                    <td className="p-3.5 font-bold font-financial text-slate-800 dark:text-slate-200">
                      {formatCurrency(pf.initial_capital)}
                    </td>
                    <td className="p-3.5 text-[11px]">
                      <span className="text-teal-600 block font-semibold">+{formatCurrency(pf.total_deposits)}</span>
                      <span className="text-rose-600 block font-semibold">-{formatCurrency(pf.total_withdrawals)}</span>
                    </td>
                    <td className="p-3.5 font-black text-sm font-financial text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(pf.current_valuation)}
                    </td>
                    <td className="p-3.5">
                      <div className={`font-bold font-financial ${netPl >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                        {formatCurrency(netPl)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">{formatPercent(roi)}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-purple-700 dark:text-purple-300 font-financial">
                        {formatCurrency(pf.total_fees_incurred)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {pf.fees_due > 0 ? `مستحق: ${formatCurrency(pf.fees_due)}` : 'خالصة'}
                      </div>
                    </td>
                    <td className="p-3.5 font-extrabold text-slate-900 dark:text-white font-financial">
                      {formatCurrency(pf.net_value)}
                    </td>
                    <td className="p-3.5 text-slate-500 text-[11px]">
                      {pf.last_valuation_date ? formatDate(pf.last_valuation_date) : '-'}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openValuationModal(pf.partner_id)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold transition-colors border border-emerald-200 dark:border-emerald-800"
                        >
                          تقييم
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPartnerId(pf.partner_id);
                            setCurrentView('statement');
                          }}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
                          title="كشف الحساب"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Valuation History Log */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">السجل التاريخي لتقييمات المحافظ</h3>
            <p className="text-xs text-slate-400 mt-0.5">سجل كامل لكل تعديل في القيمة السوقية للمحافظ</p>
          </div>
          <span className="text-xs font-bold text-slate-500">إجمالي التقييمات: {valuations.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3 rounded-r-xl">الشريك</th>
                <th className="p-3">القيمة السابقة</th>
                <th className="p-3">القيمة الجديدة</th>
                <th className="p-3">مقدار التغير</th>
                <th className="p-3">نسبة التغير</th>
                <th className="p-3">التاريخ والوقت</th>
                <th className="p-3 rounded-l-xl">السبب والتفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {valuations.map((val) => {
                const isProfit = val.change_amount > 0;
                return (
                  <tr key={val.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{val.partner_name}</td>
                    <td className="p-3 font-financial text-slate-600 dark:text-slate-400">{formatCurrency(val.previous_valuation)}</td>
                    <td className="p-3 font-bold font-financial text-slate-900 dark:text-white">{formatCurrency(val.new_valuation)}</td>
                    <td className={`p-3 font-bold font-financial ${isProfit ? 'text-green-600' : 'text-rose-600'}`}>
                      {isProfit ? `+${formatCurrency(val.change_amount)}` : formatCurrency(val.change_amount)}
                    </td>
                    <td className={`p-3 font-bold font-financial ${isProfit ? 'text-green-600' : 'text-rose-600'}`}>
                      {formatPercent(val.change_percentage)}
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {formatDate(val.valuation_date)} • {val.valuation_time}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 truncate max-w-xs">{val.reason || '-'}</td>
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
