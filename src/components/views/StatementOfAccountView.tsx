'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  FileText,
  Printer,
  FileSpreadsheet,
  Calendar,
  DollarSign,
  User,
  Percent,
  RefreshCw,
  TrendingUp,
  Building,
} from 'lucide-react';
import { formatCurrency, formatDate, getTransactionTypeLabel } from '@/lib/utils';
import { Partner, Portfolio, Transaction } from '@/lib/types';
import * as XLSX from 'xlsx';

export default function StatementOfAccountView() {
  const { user, selectedPartnerId, setSelectedPartnerId, systemSettings, refreshKey } = useApp();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [partner, setPartner] = useState<(Partner & { portfolio?: Portfolio }) | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Determine active partner id
  const activePartnerId = user?.role === 'partner' ? user.partner_id : selectedPartnerId;

  // Load partners list if admin
  useEffect(() => {
    if (user?.role === 'admin') {
      fetch('/api/partners')
        .then((r) => r.json())
        .then((data) => {
          setPartners(data.partners || []);
          if (!selectedPartnerId && data.partners?.length > 0) {
            setSelectedPartnerId(data.partners[0].id);
          }
        });
    }
  }, [user, selectedPartnerId]);

  // Load active partner statement
  useEffect(() => {
    if (!activePartnerId) return;

    const fetchStatement = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({ partner_id: activePartnerId });
        if (fromDate) params.append('from_date', fromDate);
        if (toDate) params.append('to_date', toDate);

        const [pRes, tRes] = await Promise.all([
          fetch(`/api/partners/${activePartnerId}`),
          fetch(`/api/transactions?${params.toString()}`),
        ]);

        if (pRes.ok) {
          const pData = await pRes.json();
          setPartner(pData.partner);
        }
        if (tRes.ok) {
          const tData = await tRes.json();
          // Sort chronological for statement ledger
          const sorted = (tData.transactions || []).sort((a: Transaction, b: Transaction) => {
            const dateCmp = a.date.localeCompare(b.date);
            if (dateCmp !== 0) return dateCmp;
            return a.time.localeCompare(b.time);
          });
          setTransactions(sorted);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatement();
  }, [activePartnerId, fromDate, toDate, refreshKey]);

  const handlePrint = () => {
    window.print();
  };

  const exportExcel = () => {
    if (!partner) return;
    const data = transactions.map((t, idx) => ({
      'م': idx + 1,
      'رقم الحركة': t.transaction_number,
      'التاريخ': t.date,
      'الوقت': t.time,
      'نوع العملية': getTransactionTypeLabel(t.type).label,
      'المبلغ (ج.م)': t.amount,
      'الرصيد بعد الحركة (ج.م)': t.balance_after,
      'البيان': t.notes || '-',
      'طريقة الدفع': t.payment_method || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `كشف_حساب_${partner.full_name}`);
    XLSX.writeFile(wb, `كشف_حساب_${partner.full_name}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const pf = partner?.portfolio;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Action Bar (No Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-emerald-600" />
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white">كشف الحساب التفصيلي للشريك</h1>
            <p className="text-xs text-slate-400">كشف مالي معتمد يوضح كافة الحركات وتطور الرصيد</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Partner Picker if Admin */}
          {user?.role === 'admin' && (
            <select
              value={activePartnerId || ''}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          )}

          {/* Date range */}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
            title="من تاريخ"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
            title="إلى تاريخ"
          />

          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة / PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Statement Document Card */}
      <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-white text-slate-900 shadow-xl border border-slate-200 print-card overflow-hidden">
        {/* Statement Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b-2 border-slate-900 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Building className="w-6 h-6 text-emerald-700" />
              <h2 className="text-xl font-black text-slate-900">
                {systemSettings?.system_name || 'مركز الشاطبي لإدارة المحافظ الاستثمارية'}
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1 font-semibold">
              مدير الاستثمار: {systemSettings?.manager_name || 'مدير الاستثمار'}
            </p>
            <p className="text-xs text-slate-500">
              تاريخ استخراج الكشف: {formatDate(new Date().toISOString())}
            </p>
          </div>

          <div className="text-left">
            <span className="inline-block px-3 py-1 rounded-lg bg-slate-900 text-white font-extrabold text-xs tracking-wider uppercase mb-1">
              كشف حساب محفظة
            </span>
            <div className="text-xs font-mono text-slate-500">STMT-{new Date().getFullYear()}-{partner?.id?.substring(4, 9)}</div>
          </div>
        </div>

        {/* Partner Info & Portfolio Key Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-6 text-xs">
          <div>
            <span className="text-slate-500 block mb-0.5">اسم الشريك المستثمر:</span>
            <span className="font-extrabold text-sm text-slate-900">{partner?.full_name}</span>
          </div>

          <div>
            <span className="text-slate-500 block mb-0.5">رقم الهاتف:</span>
            <span className="font-bold text-slate-800">{partner?.phone}</span>
          </div>

          <div>
            <span className="text-slate-500 block mb-0.5">تاريخ الانضمام:</span>
            <span className="font-bold text-slate-800">{formatDate(partner?.join_date)}</span>
          </div>

          <div>
            <span className="text-slate-500 block mb-0.5">حالة الحساب:</span>
            <span className="font-bold text-emerald-700">نشط ومعتمد</span>
          </div>
        </div>

        {/* Financial Summary 4-Box Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
            <span className="text-[11px] text-slate-500 block mb-1">رأس المال الأصلي</span>
            <span className="text-base font-extrabold text-slate-900 font-financial">
              {formatCurrency(pf?.initial_capital)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
            <span className="text-[11px] text-slate-500 block mb-1">إجمالي الأرباح المحققة</span>
            <span className="text-base font-extrabold text-green-700 font-financial">
              +{formatCurrency((pf?.total_profits || 0) - (pf?.total_losses || 0))}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
            <span className="text-[11px] text-slate-500 block mb-1">إجمالي أتعاب الإدارة (2%)</span>
            <span className="text-base font-extrabold text-purple-700 font-financial">
              {formatCurrency(pf?.total_fees_incurred)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border-2 border-emerald-600 bg-emerald-50/50">
            <span className="text-[11px] text-emerald-900 font-bold block mb-1">القيمة الصافية الحالية</span>
            <span className="text-base font-black text-emerald-800 font-financial">
              {formatCurrency(pf?.net_value)}
            </span>
          </div>
        </div>

        {/* Statement Journal Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-right text-xs border border-slate-300">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
              <tr>
                <th className="p-3 border-l border-slate-300 w-10 text-center">م</th>
                <th className="p-3 border-l border-slate-300">التاريخ والوقت</th>
                <th className="p-3 border-l border-slate-300">رقم الحركة</th>
                <th className="p-3 border-l border-slate-300">نوع الحركة والبيان</th>
                <th className="p-3 border-l border-slate-300">المبلغ (ج.م)</th>
                <th className="p-3 border-l border-slate-300">الرصيد بعد الحركة (ج.م)</th>
                <th className="p-3">طريقة الدفع / المرجع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {transactions.map((txn, index) => {
                const typeInfo = getTransactionTypeLabel(txn.type);
                const isPlus = txn.amount > 0;
                return (
                  <tr key={txn.id} className="hover:bg-slate-50">
                    <td className="p-3 border-l border-slate-200 text-center font-bold text-slate-500">{index + 1}</td>
                    <td className="p-3 border-l border-slate-200 font-medium whitespace-nowrap">
                      {formatDate(txn.date)} <span className="text-slate-400 text-[10px]">({txn.time})</span>
                    </td>
                    <td className="p-3 border-l border-slate-200 font-mono font-bold text-slate-700">
                      {txn.transaction_number}
                    </td>
                    <td className="p-3 border-l border-slate-200">
                      <div className="font-bold text-slate-900">{typeInfo.label}</div>
                      {txn.notes && <div className="text-[11px] text-slate-500">{txn.notes}</div>}
                    </td>
                    <td className={`p-3 border-l border-slate-200 font-bold font-financial text-sm ${isPlus ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {isPlus ? `+${formatCurrency(txn.amount)}` : formatCurrency(txn.amount)}
                    </td>
                    <td className="p-3 border-l border-slate-200 font-black font-financial text-slate-900">
                      {formatCurrency(txn.balance_after)}
                    </td>
                    <td className="p-3 text-slate-600 text-[11px]">
                      {txn.payment_method || '-'} {txn.reference_no ? `(${txn.reference_no})` : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Statement Footer / Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-xs">
          <div>
            <span className="font-bold text-slate-800 block mb-1">إقرار مدير الاستثمار:</span>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              يشهد مدير الاستثمار بأن كافة الحركات الواردة في هذا الكشف مطابقة للدفاتر المحاسبية وتم تنفيذها وفق السياسة الاستثمارية المعتمدة.
            </p>
            <div className="mt-6 font-bold text-slate-900">
              التوقيع والاعتماد: .......................................
            </div>
          </div>

          <div className="text-left">
            <span className="font-bold text-slate-800 block mb-1">توقيع واستلام الشريك:</span>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              أقر أنا الشريك المستثمر بصحة واكتمال الحركات المالية المسجلة على محفظتي المذكورة أعلاه.
            </p>
            <div className="mt-6 font-bold text-slate-900">
              توقيع الشريك: .......................................
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
