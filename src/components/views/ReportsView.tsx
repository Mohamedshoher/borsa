'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  Download,
  Users,
  Briefcase,
  TrendingUp,
  Percent,
  Coins,
  RefreshCw,
  Building,
} from 'lucide-react';
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils';
import * as XLSX from 'xlsx';

export default function ReportsView() {
  const { user, systemSettings, refreshKey } = useApp();

  const [reportType, setReportType] = useState<string>('partners');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ type: reportType });
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, fromDate, toDate, refreshKey]);

  const handlePrint = () => {
    window.print();
  };

  const exportExcel = () => {
    if (!reportData) return;
    let exportRows: any[] = [];
    let sheetName = 'التقرير المالي';

    if (reportType === 'partners' || reportType === 'portfolios') {
      sheetName = 'تقرير الشركاء والمحافظ';
      exportRows = reportData.partners.map((p: any) => ({
        'اسم الشريك': p.full_name,
        'الهاتف': p.phone,
        'تاريخ الانضمام': p.join_date,
        'الحالة': p.status === 'active' ? 'نشط' : 'موقوف',
        'رأس المال (ج.م)': p.initial_capital,
        'القيمة الحالية (ج.م)': p.current_valuation,
        'الأرباح المحققة': p.total_profits,
        'الخسائر المسجلة': p.total_losses,
        'الأتعاب المستحقة': p.fees_due,
        'الأتعاب المدفوعة': p.fees_paid,
        'صافي القيمة (ج.م)': p.net_value,
        'نسبة العائد %': p.roi_percentage,
      }));
    } else if (reportType === 'deposits') {
      sheetName = 'تقرير الإيداعات';
      exportRows = reportData.deposits.map((d: any) => ({
        'الشريك': d.partner_name,
        'المبلغ (ج.م)': d.amount,
        'طريقة الدفع': d.payment_method,
        'رقم المرجع': d.reference_no || '-',
        'التاريخ': d.deposit_date,
        'الوقت': d.deposit_time,
        'ملاحظات': d.notes || '-',
      }));
    } else if (reportType === 'withdrawals') {
      sheetName = 'تقرير السحوبات';
      exportRows = reportData.withdrawals.map((w: any) => ({
        'الشريك': w.partner_name,
        'المبلغ (ج.م)': w.amount,
        'طريقة الدفع': w.payment_method,
        'رقم المرجع': w.reference_no || '-',
        'التاريخ': w.withdrawal_date,
        'الوقت': w.withdrawal_time,
        'ملاحظات': w.notes || '-',
      }));
    } else if (reportType === 'fees') {
      sheetName = 'تقرير أتعاب الإدارة';
      exportRows = reportData.management_fees.map((f: any) => ({
        'الشريك': f.partner_name,
        'نوع الاستحقاق': f.fee_type === 'INITIAL' ? 'أتعاب بداية الاستثمار' : 'أتعاب شهرية',
        'الشهر': f.period_month,
        'القيمة عند الاحتساب': f.portfolio_value_at_calc,
        'النسبة %': f.fee_percentage,
        'قيمة الأتعاب (ج.م)': f.fee_amount,
        'الحالة': f.status === 'collected' ? 'محصلة' : 'مستحقة',
        'تاريخ الاستحقاق': f.calculation_date,
        'تاريخ التحصيل': f.collection_date || '-',
      }));
    }

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${sheetName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const reportTabs = [
    { id: 'partners', label: 'تقرير الشركاء والمحافظ', icon: Users },
    { id: 'fees', label: 'تقرير أتعاب الإدارة (2%)', icon: Percent },
    { id: 'deposits', label: 'تقرير الإيداعات', icon: Coins },
    { id: 'withdrawals', label: 'تقرير السحوبات', icon: Coins },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header (No print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">مركز التقارير والتصدير المالي</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            استخراج تقارير تفصيلية وشهرية مع إمكانية التصدير إلى Excel والطباعة المباشرة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير Excel (XLSX)</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير / PDF</span>
          </button>
        </div>
      </div>

      {/* Report Switcher Tabs (No Print) */}
      <div className="no-print p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-2">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = reportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}

        <div className="mr-auto flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            title="من تاريخ"
          />
          <span className="text-xs text-slate-400">إلى</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            title="إلى تاريخ"
          />
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div className="p-8 rounded-3xl bg-white text-slate-900 shadow-xl border border-slate-200 print-card">
        {/* Report Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Building className="w-6 h-6 text-emerald-700" />
              <h2 className="text-xl font-black text-slate-900">{systemSettings?.system_name || 'مركز الشاطبي'}</h2>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 font-semibold">
              مدير الاستثمار: {systemSettings?.manager_name}
            </p>
            <p className="text-xs text-slate-500">
              تاريخ التقرير: {formatDate(new Date().toISOString())} {fromDate ? `(الفترة: من ${fromDate} إلى ${toDate || 'الآن'})` : ''}
            </p>
          </div>

          <div className="text-left">
            <span className="inline-block px-3 py-1 rounded-lg bg-emerald-700 text-white font-black text-xs">
              {reportTabs.find((t) => t.id === reportType)?.label}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
          </div>
        ) : !reportData ? (
          <div className="p-12 text-center text-slate-400">لا توجد بيانات</div>
        ) : (
          <div className="space-y-6">
            {/* Executive Summary Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[11px] text-slate-500 block">إجمالي رأس المال</span>
                <span className="text-base font-extrabold text-slate-900 font-financial">
                  {formatCurrency(reportData.summary.total_capital)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">إجمالي القيمة السوقية</span>
                <span className="text-base font-extrabold text-emerald-700 font-financial">
                  {formatCurrency(reportData.summary.total_valuation)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">صافي الأرباح المحققة</span>
                <span className="text-base font-extrabold text-green-700 font-financial">
                  {formatCurrency(reportData.summary.net_profit_loss)} ({formatPercent(reportData.summary.overall_roi_percentage)})
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">إجمالي أتعاب الإدارة</span>
                <span className="text-base font-extrabold text-purple-700 font-financial">
                  {formatCurrency(reportData.summary.total_fees_incurred)}
                </span>
              </div>
            </div>

            {/* Dynamic Table according to reportType */}
            {(reportType === 'partners' || reportType === 'portfolios') && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border border-slate-300">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-3 border-l border-slate-300">الشريك</th>
                      <th className="p-3 border-l border-slate-300">رأس المال الأصلي</th>
                      <th className="p-3 border-l border-slate-300">القيمة الحالية</th>
                      <th className="p-3 border-l border-slate-300">الأرباح</th>
                      <th className="p-3 border-l border-slate-300">الخسائر</th>
                      <th className="p-3 border-l border-slate-300">أتعاب الإدارة</th>
                      <th className="p-3 border-l border-slate-300">صافي القيمة</th>
                      <th className="p-3">نسبة العائد %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.partners.map((p: any) => (
                      <tr key={p.id}>
                        <td className="p-3 border-l border-slate-200 font-bold">{p.full_name}</td>
                        <td className="p-3 border-l border-slate-200 font-financial">{formatCurrency(p.initial_capital)}</td>
                        <td className="p-3 border-l border-slate-200 font-black font-financial text-emerald-800">{formatCurrency(p.current_valuation)}</td>
                        <td className="p-3 border-l border-slate-200 text-green-700 font-financial">+{formatCurrency(p.total_profits)}</td>
                        <td className="p-3 border-l border-slate-200 text-rose-700 font-financial">-{formatCurrency(p.total_losses)}</td>
                        <td className="p-3 border-l border-slate-200 text-purple-700 font-financial">{formatCurrency(p.fees_paid + p.fees_due)}</td>
                        <td className="p-3 border-l border-slate-200 font-extrabold font-financial">{formatCurrency(p.net_value)}</td>
                        <td className="p-3 font-bold">{formatPercent(p.roi_percentage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reportType === 'fees' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border border-slate-300">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-3 border-l border-slate-300">الشريك</th>
                      <th className="p-3 border-l border-slate-300">نوع الاستحقاق</th>
                      <th className="p-3 border-l border-slate-300">الشهر</th>
                      <th className="p-3 border-l border-slate-300">التقييم وقت الاحتساب</th>
                      <th className="p-3 border-l border-slate-300">قيمة الأتعاب (2%)</th>
                      <th className="p-3 border-l border-slate-300">الحالة</th>
                      <th className="p-3">تاريخ الاستحقاق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.management_fees.map((f: any) => (
                      <tr key={f.id}>
                        <td className="p-3 border-l border-slate-200 font-bold">{f.partner_name}</td>
                        <td className="p-3 border-l border-slate-200 font-semibold">{f.fee_type === 'INITIAL' ? 'أتعاب بداية الاستثمار' : 'أتعاب شهرية'}</td>
                        <td className="p-3 border-l border-slate-200">{f.period_month}</td>
                        <td className="p-3 border-l border-slate-200 font-financial">{formatCurrency(f.portfolio_value_at_calc)}</td>
                        <td className="p-3 border-l border-slate-200 font-black font-financial text-purple-700">{formatCurrency(f.fee_amount)}</td>
                        <td className="p-3 border-l border-slate-200 font-bold">{f.status === 'collected' ? 'محصلة' : 'مستحقة'}</td>
                        <td className="p-3">{formatDate(f.calculation_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reportType === 'deposits' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border border-slate-300">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-3 border-l border-slate-300">الشريك</th>
                      <th className="p-3 border-l border-slate-300">المبلغ</th>
                      <th className="p-3 border-l border-slate-300">طريقة الدفع</th>
                      <th className="p-3 border-l border-slate-300">رقم المرجع</th>
                      <th className="p-3">التاريخ والوقت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.deposits.map((d: any) => (
                      <tr key={d.id}>
                        <td className="p-3 border-l border-slate-200 font-bold">{d.partner_name}</td>
                        <td className="p-3 border-l border-slate-200 font-bold font-financial text-emerald-700">+{formatCurrency(d.amount)}</td>
                        <td className="p-3 border-l border-slate-200">{d.payment_method}</td>
                        <td className="p-3 border-l border-slate-200 font-mono">{d.reference_no || '-'}</td>
                        <td className="p-3">{formatDate(d.deposit_date)} • {d.deposit_time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reportType === 'withdrawals' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border border-slate-300">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-3 border-l border-slate-300">الشريك</th>
                      <th className="p-3 border-l border-slate-300">المبلغ</th>
                      <th className="p-3 border-l border-slate-300">طريقة الدفع</th>
                      <th className="p-3 border-l border-slate-300">رقم المرجع</th>
                      <th className="p-3">التاريخ والوقت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.withdrawals.map((w: any) => (
                      <tr key={w.id}>
                        <td className="p-3 border-l border-slate-200 font-bold">{w.partner_name}</td>
                        <td className="p-3 border-l border-slate-200 font-bold font-financial text-rose-700">-{formatCurrency(w.amount)}</td>
                        <td className="p-3 border-l border-slate-200">{w.payment_method}</td>
                        <td className="p-3 border-l border-slate-200 font-mono">{w.reference_no || '-'}</td>
                        <td className="p-3">{formatDate(w.withdrawal_date)} • {w.withdrawal_time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
