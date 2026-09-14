'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Activity,
  Code,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { AuditLog } from '@/lib/types';

export default function AuditLogView() {
  const { user, refreshKey } = useApp();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (actionFilter !== 'ALL') params.append('action', actionFilter);
      if (entityFilter !== 'ALL') params.append('entity_type', entityFilter);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.audit_logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter, refreshKey]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">سجل التدقيق والمراقبة (Audit Log)</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            توثيق كامل لكل عملية إضافة، تعديل، إلغاء، أو تسجيل دخول مع حفظ الحالة السابقة والجديدة.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>تحديث السجل</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500 font-semibold">نوع العملية:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
          >
            <option value="ALL">جميع العمليات</option>
            <option value="CREATE">إنشاء (CREATE)</option>
            <option value="UPDATE">تعديل (UPDATE)</option>
            <option value="APPROVE">موافقة (APPROVE)</option>
            <option value="REJECT">رفض (REJECT)</option>
            <option value="REVERSE">عكس وتصحيح (REVERSE)</option>
            <option value="LOGIN">تسجيل دخول (LOGIN)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold">الكيان:</span>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
          >
            <option value="ALL">جميع الكيانات</option>
            <option value="partner">الشركاء</option>
            <option value="portfolio">المحافظ</option>
            <option value="transaction">الحركات المالية</option>
            <option value="withdrawal_request">طلبات السحب</option>
            <option value="fee">أتعاب الإدارة</option>
            <option value="settings">الإعدادات</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            لا توجد سجلات تدقيق مسجلة
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5 rounded-r-2xl">المستخدم</th>
                  <th className="p-3.5">نوع الإجراء</th>
                  <th className="p-3.5">الكيان المتأثر</th>
                  <th className="p-3.5">البيانات المعدلة / التفاصيل</th>
                  <th className="p-3.5">عنوان IP</th>
                  <th className="p-3.5 rounded-l-2xl">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => {
                  let badgeBg = 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
                  if (log.action === 'CREATE') badgeBg = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
                  if (log.action === 'UPDATE') badgeBg = 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300';
                  if (log.action === 'REVERSE') badgeBg = 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300';
                  if (log.action === 'APPROVE') badgeBg = 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300';
                  if (log.action === 'REJECT') badgeBg = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        <div>{log.user_name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">({log.user_role})</div>
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeBg}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">{log.entity_type}</td>
                      <td className="p-3.5 max-w-sm">
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto">
                          {log.new_data ? JSON.stringify(log.new_data) : log.old_data ? JSON.stringify(log.old_data) : '-'}
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-400 text-[11px]">{log.ip_address || '127.0.0.1'}</td>
                      <td className="p-3.5 text-slate-500 text-[11px] whitespace-nowrap">
                        {formatDate(log.timestamp)} • {new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </td>
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
