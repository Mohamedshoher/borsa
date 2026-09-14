'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Users,
  Search,
  Filter,
  PlusCircle,
  FileText,
  Edit,
  Power,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RefreshCw,
  Calculator,
  Percent,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils';
import { Partner, Portfolio } from '@/lib/types';

interface PartnersViewProps {
  openAddPartnerModal: () => void;
  openValuationModal: (partnerId?: string) => void;
}

export default function PartnersView({ openAddPartnerModal, openValuationModal }: PartnersViewProps) {
  const { setCurrentView, setSelectedPartnerId, showToast, triggerRefresh, refreshKey } = useApp();

  const [partners, setPartners] = useState<(Partner & { portfolio?: Portfolio; username?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'suspended'>('ALL');

  // Edit Modal State
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editFeeRate, setEditFeeRate] = useState(2.0);
  const [editNotes, setEditNotes] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Confirmation State
  const [deletingPartner, setDeletingPartner] = useState<Partner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPartners = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/partners');
      if (res.ok) {
        const data = await res.json();
        setPartners(data.partners || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, [refreshKey]);

  const togglePartnerStatus = async (partner: Partner) => {
    const newStatus = partner.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/partners/${partner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(
          `تم ${newStatus === 'active' ? 'تفعيل' : 'إيقاف'} حساب الشريك (${partner.full_name}) بنجاح`,
          newStatus === 'active' ? 'success' : 'warning'
        );
        triggerRefresh();
      }
    } catch (e) {
      showToast('فشل تعديل حالة الشريك', 'error');
    }
  };

  const startEdit = (p: Partner) => {
    setEditingPartner(p);
    setEditName(p.full_name);
    setEditPhone(p.phone);
    setEditEmail(p.email || '');
    setEditFeeRate(p.management_fee_rate !== undefined ? p.management_fee_rate : 2.0);
    setEditNotes(p.notes || '');
    setEditPassword('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;

    try {
      setIsSavingEdit(true);
      const res = await fetch(`/api/partners/${editingPartner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim() || null,
          management_fee_rate: editFeeRate,
          notes: editNotes.trim() || null,
          password: editPassword.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('فشل حفظ التعديلات');
      }

      showToast('تم تحديث بيانات الشريك ونسبة الأتعاب بنجاح', 'success');
      triggerRefresh();
      setEditingPartner(null);
    } catch (err: any) {
      showToast(err.message || 'خطأ في التحديث', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPartner) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/partners/${deletingPartner.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل حذف الشريك');
      }

      showToast(data.message || `تم حذف الشريك (${deletingPartner.full_name}) بنجاح`, 'success');
      triggerRefresh();
      setDeletingPartner(null);
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء محاولة الحذف', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = partners.filter((p) => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery) ||
      (p.username && p.username.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">إدارة الشركاء والمحافظ</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            سجل الشركاء المستثمرين، نسب أتعاب الإدارة المخصصة لكل شريك، وبيانات التواصل.
          </p>
        </div>

        <button
          onClick={openAddPartnerModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/20 transition-all active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>إضافة شريك جديد</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف أو اسم المستخدم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="ALL">جميع الحالات ({partners.length})</option>
            <option value="active">نشط فقط</option>
            <option value="suspended">موقوف فقط</option>
          </select>
        </div>
      </div>

      {/* Partners Cards Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
          لا يوجد شركاء يطابقون معايير البحث
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((partner) => {
            const pf = partner.portfolio;
            const netPl = (pf?.total_profits || 0) - (pf?.total_losses || 0);
            const roi = (pf?.initial_capital || 0) > 0 ? (netPl / (pf?.initial_capital || 1)) * 100 : 0;
            const isActive = partner.status === 'active';
            const feeRate = partner.management_fee_rate !== undefined ? partner.management_fee_rate : 2.0;

            return (
              <div
                key={partner.id}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header info */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{partner.full_name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                          @{partner.username || 'user'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          أتعاب الإدارة: {feeRate}%
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{isActive ? 'نشط' : 'موقوف'}</span>
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{partner.phone}</span>
                    </div>
                    {partner.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{partner.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>تاريخ الانضمام: {formatDate(partner.join_date)}</span>
                    </div>
                  </div>
                </div>

                {/* Portfolio Numbers Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">القيمة الحالية:</span>
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-400 font-financial text-sm">
                      {formatCurrency(pf?.current_valuation)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">رأس المال:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-financial">
                      {formatCurrency(pf?.initial_capital)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">صافي الأرباح:</span>
                    <span className={`font-bold font-financial ${netPl >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                      {formatCurrency(netPl)} ({formatPercent(roi)})
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedPartnerId(partner.id);
                      setCurrentView('statement');
                    }}
                    className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-200 hover:text-emerald-600 text-xs font-semibold transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>كشف الحساب</span>
                  </button>

                  <button
                    onClick={() => openValuationModal(partner.id)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 text-slate-600 hover:text-teal-600 transition-colors"
                    title="تحديث تقييم المحفظة"
                  >
                    <Calculator className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => startEdit(partner)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"
                    title="تعديل البيانات ونسبة الإدارة"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => togglePartnerStatus(partner)}
                    className={`p-2 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-slate-600 hover:text-amber-600'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}
                    title={isActive ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                  >
                    <Power className="w-4 h-4" />
                  </button>

                  {/* Delete Button (highlighted when suspended or available) */}
                  <button
                    onClick={() => setDeletingPartner(partner)}
                    className={`p-2 rounded-xl transition-colors ${
                      !isActive
                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:hover:bg-rose-900/60 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600'
                    }`}
                    title={!isActive ? 'حذف الشريك الموقوف نهائياً' : 'حذف الشريك'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Partner Confirmation Modal */}
      {deletingPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/50 overflow-hidden my-8">
            <div className="px-6 py-4 bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/10">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold">تأكيد مسح / حذف الشريك</h2>
                  <p className="text-[11px] text-rose-100">إجراء نهائي لا يمكن التراجع عنه</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingPartner(null)}
                className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
                  هل أنت متأكد من رغبتك في حذف الشريك <strong className="font-bold text-rose-700 dark:text-rose-300">({deletingPartner.full_name})</strong>؟
                  <br />
                  سيتم حذف حساب الشريك والمحفظة الاستثمارية وجميع العمليات والإيداعات والتقييمات المرتبطة به نهائياً من النظام.
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">اسم المستخدم:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">@{deletingPartner.username || 'user'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">رأس المال:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-financial">
                    {formatCurrency(deletingPartner.portfolio?.initial_capital)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">الحالة الحالية:</span>
                  <span className={`font-bold ${deletingPartner.status === 'suspended' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {deletingPartner.status === 'suspended' ? 'موقوف' : 'نشط'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingPartner(null)}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-950/20 disabled:opacity-50 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف النهائي'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Partner Modal with Custom Fee Rate input */}
      {editingPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <h2 className="text-base font-bold">تعديل بيانات الشريك ({editingPartner.full_name})</h2>
              <button onClick={() => setEditingPartner(null)} className="p-1 rounded-full hover:bg-white/20">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الهاتف *</label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Custom Management Fee Rate for this partner */}
                <div>
                  <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-1">
                    نسبة أتعاب الإدارة (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      required
                      value={editFeeRate}
                      onChange={(e) => setEditFeeRate(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border-2 border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/30 text-purple-950 dark:text-purple-100 font-extrabold text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none font-financial"
                    />
                    <Percent className="w-3.5 h-3.5 absolute left-2.5 top-3 text-purple-600" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تعيين كلمة مرور جديدة (اتركه فارغاً للإبقاء عليها)</label>
                <input
                  type="password"
                  placeholder="كلمة مرور جديدة..."
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ملاحظات</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPartner(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
                >
                  {isSavingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
