'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { X, UserPlus, Calculator, DollarSign, Lock, ShieldCheck, CheckCircle, Percent } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface AddPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddPartnerModal({ isOpen, onClose }: AddPartnerModalProps) {
  const { showToast, triggerRefresh, systemSettings } = useApp();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [initialCapital, setInitialCapital] = useState('100000');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [joinTime, setJoinTime] = useState('10:00');
  const [paymentMethod, setPaymentMethod] = useState('تحويل بنكي');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [calcInitialFee, setCalcInitialFee] = useState(true);
  const [feeRate, setFeeRate] = useState(systemSettings?.default_mgmt_fee_rate || 2.0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const parsedCapital = parseFloat(initialCapital) || 0;
  const initialFeePreview = calcInitialFee ? Math.round(parsedCapital * (feeRate / 100) * 100) / 100 : 0;

  const handleNameChange = (val: string) => {
    setFullName(val);
    if (!username) {
      const parts = val.trim().split(' ');
      if (parts.length > 0 && parts[0]) {
        setUsername(`partner_${Math.floor(100 + Math.random() * 900)}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || parsedCapital <= 0 || !username.trim() || !password.trim()) {
      showToast('يرجى ملء جميع الحقول الإلزامية برأس مال صحيح', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          initial_capital: parsedCapital,
          join_date: joinDate,
          join_time: joinTime,
          payment_method: paymentMethod,
          username: username.trim().toLowerCase(),
          password: password.trim(),
          notes: notes.trim() || null,
          calculate_initial_fee: calcInitialFee,
          management_fee_rate: feeRate,
          initial_fee_rate: feeRate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشلت عملية إنشاء الشريك');
      }

      showToast(`تم إنشاء حساب ومحفظة الشريك (${fullName}) بنسبة أتعاب (${feeRate}%) بنجاح`, 'success');
      triggerRefresh();
      onClose();

      // Reset form
      setFullName('');
      setPhone('');
      setEmail('');
      setInitialCapital('100000');
      setUsername('');
      setPassword('');
      setNotes('');
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ غير متوقع', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">إضافة شريك مستثمر جديد</h2>
              <p className="text-[11px] sm:text-xs text-emerald-100 mt-0.5">
                تحديد رأس المال، نسبة أتعاب الإدارة، وحساب الدخول
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body with Internal Smooth Scrolling */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Section 1: Partner Personal Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>1. البيانات الشخصية للشريك</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم الكامل للشريك *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد محمود الشناوي"
                  value={fullName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الهاتف للتواصل *
                </label>
                <input
                  type="text"
                  required
                  placeholder="01012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  البريد الإلكتروني (اختياري)
                </label>
                <input
                  type="email"
                  placeholder="partner@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Investment Details & Custom Management Fee Rate */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              <span>2. بيانات الاستثمار ونسبة أتعاب الإدارة المخصصة</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  مبلغ الاستثمار عند البداية (جنيه مصري) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="100000"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(e.target.value)}
                    className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-financial"
                  />
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">ج.م</span>
                </div>
              </div>

              {/* Custom Management Fee Rate for this partner */}
              <div>
                <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-1">
                  نسبة أتعاب الإدارة الخاصة بهذا الشريك (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={feeRate}
                    onChange={(e) => setFeeRate(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/30 text-purple-950 dark:text-purple-100 font-extrabold text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none font-financial"
                  />
                  <Percent className="w-4 h-4 absolute left-3 top-3 text-purple-600" />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  الافتراضية: 2% (يمكنك تعديلها بحرية لهذا الشريك)
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  طريقة استلام المبلغ
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="تحويل بنكي">تحويل بنكي</option>
                  <option value="إنستاباي / فودافون كاش">إنستاباي / محافظ إلكترونية</option>
                  <option value="إيداع نقدي">إيداع نقدي</option>
                  <option value="شيك بنكي">شيك بنكي</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ الدخول *
                  </label>
                  <input
                    type="date"
                    required
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    الوقت *
                  </label>
                  <input
                    type="time"
                    required
                    value={joinTime}
                    onChange={(e) => setJoinTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Initial Management Fee Calculator Box */}
            <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  <input
                    type="checkbox"
                    checked={calcInitialFee}
                    onChange={(e) => setCalcInitialFee(e.target.checked)}
                    className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>احتساب أتعاب بداية الاستثمار ({feeRate}%) تلقائياً</span>
                </label>
                <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 font-financial">
                  {formatCurrency(initialFeePreview)}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
                وفق نسبة هذا الشريك ({feeRate}%): تُستحق أتعاب بداية استثمار بمبلغ {formatCurrency(initialFeePreview)} ({formatCurrency(parsedCapital)} × {feeRate}%).
              </p>
            </div>
          </div>

          {/* Section 3: Partner Login Credentials */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>3. بيانات حساب الدخول للشريك</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المستخدم (Login Username) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ahmed_investor"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-left dir-ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  كلمة المرور *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-left dir-ltr"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات أو توصيات استثمارية
                </label>
                <textarea
                  rows={2}
                  placeholder="أي ملاحظات حول استراتيجية المحفظة أو قطاعات التركيز..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/20 transition-all disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الحفظ والإنشاء...' : 'حفظ وإنشاء المحفظة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
