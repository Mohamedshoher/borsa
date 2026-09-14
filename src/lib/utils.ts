import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency with Egyptian Pounds (EGP / ج.م)
 */
export function formatCurrency(amount: number | null | undefined, includeSymbol: boolean = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '0.00 ج.م';
  const formatted = new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return includeSymbol ? `${formatted} ج.م` : formatted;
}

/**
 * Format percentage with Arabic style
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0.00%';
  const prefix = value > 0 ? '+' : '';
  const formatted = new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${prefix}${formatted}%`;
}

/**
 * Format Date to readable Arabic
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Format short date (YYYY-MM-DD)
 */
export function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Get human Arabic label for transaction types
 */
export function getTransactionTypeLabel(type: string): { label: string; color: string; bg: string; border: string } {
  switch (type) {
    case 'INITIAL_INVESTMENT':
      return { label: 'بداية الاستثمار', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/50', border: 'border-blue-200 dark:border-blue-800' };
    case 'DEPOSIT':
      return { label: 'إيداع إضافي', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/50', border: 'border-emerald-200 dark:border-emerald-800' };
    case 'WITHDRAWAL':
      return { label: 'سحب', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/50', border: 'border-rose-200 dark:border-rose-800' };
    case 'PROFIT':
      return { label: 'أرباح استثمار', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-950/50', border: 'border-green-200 dark:border-green-800' };
    case 'LOSS':
      return { label: 'خسائر استثمار', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/50', border: 'border-amber-200 dark:border-amber-800' };
    case 'INITIAL_MGMT_FEE':
      return { label: 'أتعاب إدارة - بداية الاستثمار (2%)', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-950/50', border: 'border-purple-200 dark:border-purple-800' };
    case 'MONTHLY_MGMT_FEE':
      return { label: 'أتعاب إدارة - شهرية (2%)', color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-950/50', border: 'border-indigo-200 dark:border-indigo-800' };
    case 'SETTLEMENT':
      return { label: 'تسوية محاسبية', color: 'text-teal-700 dark:text-teal-300', bg: 'bg-teal-50 dark:bg-teal-950/50', border: 'border-teal-200 dark:border-teal-800' };
    case 'REVERSAL':
      return { label: 'عكس عملية (تصحيح)', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-950/50', border: 'border-orange-200 dark:border-orange-800' };
    default:
      return { label: type, color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700' };
  }
}

/**
 * Format Arabic month name from period string (e.g. "2026-09" -> "سبتمبر 2026")
 */
export function formatPeriodMonth(period: string): string {
  if (!period || period === 'INITIAL') return 'بداية الاستثمار';
  const parts = period.split('-');
  if (parts.length !== 2) return period;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  return `${arabicMonths[monthIdx] || parts[1]} ${year}`;
}
