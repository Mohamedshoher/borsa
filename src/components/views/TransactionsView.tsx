'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  ReceiptText,
  Search,
  Filter,
  RotateCcw,
  RefreshCw,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency, formatDate, getTransactionTypeLabel } from '@/lib/utils';
import { Transaction, Partner } from '@/lib/types';
import * as XLSX from 'xlsx';

interface TransactionsViewProps {
  openReverseModal: (txn: Transaction) => void;
}

export default function TransactionsView({ openReverseModal }: TransactionsViewProps) {
  const { user, refreshKey } = useApp();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [partnerFilter, setPartnerFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (partnerFilter !== 'ALL') params.append('partner_id', partnerFilter);
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      const [tRes, pRes] = await Promise.all([
        fetch(`/api/transactions?${params.toString()}`),
        user?.role === 'admin' ? fetch('/api/partners') : Promise.resolve(null),
      ]);

      if (tRes.ok) {
        const tData = await tRes.json();
        setTransactions(tData.transactions || []);
      }
      if (pRes && pRes.ok) {
        const pData = await pRes.json();
        setPartners(pData.partners || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [partnerFilter, typeFilter, fromDate, toDate, refreshKey]);

  // Export to Excel (SheetJS)
  const exportToExcel = () => {
    const dataToExport = transactions.map((t) => ({
      'رقم الحركة': t.transaction_number,
      'اسم الشريك': t.partner_name,
      'نوع الحركة': getTransactionTypeLabel(t.type).label,
      'المبلغ (ج.م)': t.amount,
      'الرصيد قبل الحركة': t.balance_before,
      'الرصيد بعد الحركة': t.balance_after,
      'التاريخ': t.date,
      'الوقت': t.time,
      'طريقة الدفع': t.payment_method || '-',
      'رقم المرجع': t.reference_no || '-',
      'البيان والملاحظات': t.notes || '-',
      'معكوسة': t.is_reversed ? 'نعم' : 'لا',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سجل القيود المالية');
    XLSX.writeFile(wb, `سجل_العمليات_المالية_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredTxns = transactions.filter((t) => {
    const matchesSearch =
      t.transaction_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.partner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">سجل القيود والحركات المالية المركزي</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            دفتر الأستاذ المالي - جميع العمليات موثقة برصيد قبل وبعد ومحمية من الحذف.
          </p>
        </div>

        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-md transition-all active:scale-95"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>تصدير إلى Excel</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالرقم أو البيان..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Partner filter (Admin only) */}
          {user?.role === 'admin' && (
            <div>
              <select
                value={partnerFilter}
                onChange={(e) => setPartnerFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="ALL">جميع الشركاء</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">جميع أنواع العمليات</option>
              <option value="INITIAL_INVESTMENT">بداية الاستثمار</option>
              <option value="DEPOSIT">إيداع إضافي</option>
              <option value="WITHDRAWAL">سحب</option>
              <option value="PROFIT">أرباح استثمار</option>
              <option value="LOSS">خسائر استثمار</option>
              <option value="INITIAL_MGMT_FEE">أتعاب بداية الاستثمار (2%)</option>
              <option value="MONTHLY_MGMT_FEE">أتعاب شهرية (2%)</option>
              <option value="SETTLEMENT">تسوية محاسبية</option>
              <option value="REVERSAL">عكس عملية (تصحيح)</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="من تاريخ"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* To Date */}
          <div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="إلى تاريخ"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
          </div>
        ) : filteredTxns.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            لا توجد حركات مالية مسجلة تطابق الشروط
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5 rounded-r-2xl">رقم الحركة</th>
                  <th className="p-3.5">الشريك</th>
                  <th className="p-3.5">نوع الحركة</th>
                  <th className="p-3.5">المبلغ</th>
                  <th className="p-3.5">الرصيد السابق</th>
                  <th className="p-3.5">الرصيد بعد الحركة</th>
                  <th className="p-3.5">التاريخ والوقت</th>
                  <th className="p-3.5">البيان / الملاحظات</th>
                  {user?.role === 'admin' && <th className="p-3.5 rounded-l-2xl text-center">إجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTxns.map((txn) => {
                  const typeInfo = getTransactionTypeLabel(txn.type);
                  const isRev = txn.is_reversed === 1;

                  return (
                    <tr
                      key={txn.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isRev ? 'opacity-60 bg-amber-50/30 dark:bg-amber-950/10' : ''
                      }`}
                    >
                      <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {txn.transaction_number}
                        {isRev && (
                          <span className="mr-1 inline-block text-[9px] px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold">
                            معكوسة
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">{txn.partner_name}</td>
                      <td className="p-3.5">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${typeInfo.bg} ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className={`p-3.5 font-bold font-financial text-sm ${txn.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {txn.amount > 0 ? `+${formatCurrency(txn.amount)}` : formatCurrency(txn.amount)}
                      </td>
                      <td className="p-3.5 font-financial text-slate-500">
                        {formatCurrency(txn.balance_before)}
                      </td>
                      <td className="p-3.5 font-extrabold font-financial text-slate-900 dark:text-white">
                        {formatCurrency(txn.balance_after)}
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {formatDate(txn.date)} • {txn.time}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {txn.notes || '-'}
                      </td>

                      {user?.role === 'admin' && (
                        <td className="p-3.5 text-center">
                          {!isRev && txn.type !== 'REVERSAL' && (
                            <button
                              onClick={() => openReverseModal(txn)}
                              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 text-slate-500 hover:text-orange-600 transition-colors"
                              title="عكس وتصحيح الحركة"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
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
