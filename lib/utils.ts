import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** الأرقام لاتينية دايماً، وبفواصل آلاف — 1,250 مش ١٢٥٠ */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

/** المبلغ + العملة، بصيغة بسيطة يقراها أي حدا: «250 ₪» */
export function formatMoney(amount: number, currency = 'ILS'): string {
  const symbol = currency === 'ILS' ? '₪' : currency
  return `${formatNumber(Math.round(amount))} ${symbol}`
}

const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** وقت نسبي بلغة محكية: «من ساعتين»، «من 3 أيام» */
export function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)

  if (mins < 1) return 'هلأ'
  if (mins < 60) return `من ${mins} دقيقة`

  const hrs = Math.floor(mins / 60)
  if (hrs === 1) return 'من ساعة'
  if (hrs === 2) return 'من ساعتين'
  if (hrs < 24) return `من ${hrs} ساعات`

  const d = Math.floor(hrs / 24)
  if (d === 1) return 'من يوم'
  if (d === 2) return 'من يومين'
  if (d < 30) return `من ${d} أيام`

  const m = Math.floor(d / 30)
  if (m === 1) return 'من شهر'
  if (m === 2) return 'من شهرين'
  return `من ${m} شهور`
}

/** «باقي 3 أيام» / «متأخر 2 يوم» — للتجديدات والمهام */
export function daysLabel(days: number | null): string {
  if (days === null) return '—'
  if (days === 0) return 'اليوم'
  if (days === 1) return 'بكرا'
  if (days === -1) return 'متأخر يوم'
  if (days < 0) return `متأخر ${Math.abs(days)} يوم`
  return `باقي ${days} يوم`
}

export function hoursLabel(hours: number): string {
  const d = Math.floor(hours / 24)
  if (d < 1) return `${hours} ساعة`
  if (d === 1) return 'يوم'
  if (d === 2) return 'يومين'
  return `${d} أيام`
}

/** الحروف الأولى للأفاتار */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => !['د.', 'أ.', 'م.'].includes(p))
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

/** التحقق من الرقم: لازم يبدأ بـ +970 أو +972 */
export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone)
  return /^\+(970|972)[0-9]{8,9}$/.test(normalized)
}

/** نفس منطق normalize_phone بقاعدة البيانات — الرقم المحلي بيصير +970 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/[^0-9+]/g, '')
  if (digits.startsWith('00')) return '+' + digits.slice(2)
  if (digits.startsWith('+')) return '+' + digits.slice(1).replace(/\D/g, '')
  if (digits.startsWith('0')) return '+970' + digits.slice(1)
  return digits ? '+' + digits : ''
}
