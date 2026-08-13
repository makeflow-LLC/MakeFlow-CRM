import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** الأرقام لاتينية دايماً، وبفواصل آلاف — 1,250 ليس ١٢٥٠ */
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

/**
 * صيغة الجمع في العربية الفصحى: المفرد، ثم المثنى، ثم جمع القلة (3-10)،
 * ثم التمييز المفرد المنصوب (11 فأكثر). تطبيقها يجعل النص يقرأ صحيحاً
 * بدل «3 يوم» أو «15 أيام».
 */
export function pluralize(
  n: number,
  forms: { one: string; two: string; few: string; many: string },
): string {
  if (n === 1) return forms.one
  if (n === 2) return forms.two
  if (n >= 3 && n <= 10) return `${n} ${forms.few}`
  return `${n} ${forms.many}`
}

const MINUTE = { one: 'دقيقة', two: 'دقيقتين', few: 'دقائق', many: 'دقيقة' }
const HOUR = { one: 'ساعة', two: 'ساعتين', few: 'ساعات', many: 'ساعة' }
const DAY = { one: 'يوم', two: 'يومين', few: 'أيام', many: 'يوماً' }
const MONTH = { one: 'شهر', two: 'شهرين', few: 'أشهر', many: 'شهراً' }

export const ROW = { one: 'صف واحد', two: 'صفّان', few: 'صفوف', many: 'صفاً' }
export const CONTACT = {
  one: 'جهة اتصال واحدة', two: 'جهتا اتصال',
  few: 'جهات اتصال', many: 'جهة اتصال',
}

/** مدة منقضية: «قبل ساعتين»، «قبل 3 أيام» */
export function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)

  if (mins < 1) return 'الآن'
  if (mins < 60) return `قبل ${pluralize(mins, MINUTE)}`

  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `قبل ${pluralize(hrs, HOUR)}`

  const d = Math.floor(hrs / 24)
  if (d < 30) return `قبل ${pluralize(d, DAY)}`

  return `قبل ${pluralize(Math.floor(d / 30), MONTH)}`
}

/** موعد قادم أو فائت: «بعد 3 أيام»، «متأخر يومين» */
export function daysLabel(days: number | null): string {
  if (days === null) return '—'
  if (days === 0) return 'اليوم'
  if (days === 1) return 'غداً'
  if (days < 0) return `متأخر ${pluralize(Math.abs(days), DAY)}`
  return `بعد ${pluralize(days, DAY)}`
}

/** مدة التوقف على المرحلة: «3 أيام»، «ساعتين» */
export function hoursLabel(hours: number): string {
  const d = Math.floor(hours / 24)
  if (d < 1) return pluralize(hours, HOUR)
  return pluralize(d, DAY)
}

/** الحروف الأولى للصورة الرمزية */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => !['د.', 'أ.', 'م.'].includes(p))
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

/** التحقق من الرقم: يجب أن يبدأ بـ +970 أو +972 */
export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone)
  return /^\+(970|972)[0-9]{8,9}$/.test(normalized)
}

/** المنطق نفسه المطبَّق في normalize_phone بقاعدة البيانات */
export function normalizePhone(input: string): string {
  const digits = input.replace(/[^0-9+]/g, '')
  if (digits.startsWith('00')) return '+' + digits.slice(2)
  if (digits.startsWith('+')) return '+' + digits.slice(1).replace(/\D/g, '')
  if (digits.startsWith('0')) return '+970' + digits.slice(1)
  return digits ? '+' + digits : ''
}
