/**
 * المال بعملتين.
 *
 * القاعدة التي يقوم عليها هذا الملف كله: **لا يُجمع مبلغان بعملتين مختلفتين
 * إلا بعد تحويلهما**. الجمع المباشر يعطي رقماً لا يعني شيئاً، وهو أسوأ من
 * غياب الرقم لأنه يبدو صحيحاً.
 *
 * والتحويل نوعان، والفرق بينهما جوهري:
 *
 *   • **المقبوض** — حقيقة تاريخية. يُحوَّل بسعر يوم قبضه، ويُخزَّن محوَّلاً
 *     في `payments.amount_base`. لو حُوّل وقت العرض لتغيّر دخل الربع الماضي
 *     كل صباح، ولما طابق كشف البنك أبداً.
 *
 *   • **المتوقَّع** — قيمة صفقة أو اشتراك لم يُقبض بعد. يُحوَّل بالسعر
 *     الحالي عند القراءة، لأن السؤال هو «كم يساوي خطّ مبيعاتي اليوم».
 */

export interface CurrencyRate {
  code: string
  /** كم وحدة من هذه العملة تساوي وحدة واحدة من عملة الأساس */
  units_per_base: number
  updated_at: string
}

export interface MoneySettings {
  base: string
  rates: Record<string, number>
}

export const DEFAULT_MONEY: MoneySettings = { base: 'USD', rates: { USD: 1 } }

const SYMBOLS: Record<string, string> = {
  USD: '$',
  ILS: '₪',
  EUR: '€',
  JOD: 'د.أ',
  EGP: 'ج.م',
  SAR: 'ر.س',
  AED: 'د.إ',
}

/** العملات المعروضة في قوائم الاختيار */
export const CURRENCIES: { code: string; label: string }[] = [
  { code: 'USD', label: 'دولار أمريكي ($)' },
  { code: 'ILS', label: 'شيكل (₪)' },
  { code: 'EUR', label: 'يورو (€)' },
  { code: 'JOD', label: 'دينار أردني' },
  { code: 'EGP', label: 'جنيه مصري' },
]

export function symbolFor(code: string): string {
  return SYMBOLS[code] ?? code
}

export function currencyLabel(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.label ?? code
}

/**
 * تحويل مبلغ إلى عملة الأساس بالسعر الحالي — للمبالغ المتوقَّعة وحدها.
 * عملة بلا سعر مسجَّل تُعاد كما هي بدل أن تُسقَط: إسقاطها يخفي مالاً،
 * وإظهارها بلا تحويل خطأٌ ظاهر يُصحَّح.
 */
export function toBase(amount: number, currency: string, money: MoneySettings): number {
  if (!amount) return 0
  if (currency === money.base) return amount

  const rate = money.rates[currency]
  if (!rate || rate <= 0) return amount

  return amount / rate
}

/** العكس: من عملة الأساس إلى عملة أخرى — لعرض المسدَّد بعملة صفقته */
export function fromBase(baseAmount: number, currency: string, money: MoneySettings): number {
  if (!baseAmount) return 0
  if (currency === money.base) return baseAmount

  const rate = money.rates[currency]
  if (!rate || rate <= 0) return baseAmount

  return baseAmount * rate
}

/** المبلغ + رمز عملته: «‎$150‎» أو «‎550 ₪‎» */
export function formatMoney(amount: number, currency = 'USD'): string {
  const n = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.abs(amount) < 100 && !Number.isInteger(amount) ? 2 : 0,
  }).format(amount)

  const symbol = symbolFor(currency)
  // رمز الدولار يسبق الرقم بالعُرف، وبقيّة الرموز تتبعه
  return currency === 'USD' || currency === 'EUR' ? `${symbol}${n}` : `${n} ${symbol}`
}

/**
 * مبلغٌ بعملته الأصلية ومعه ما يقابله بالأساس، حين يختلفان.
 * إظهار الاثنين معاً هو ما يمنع فقدان الحقيقة الأصلية: الإيصال يقول
 * «‎550 ₪‎»، والتقرير يقول «‎$149‎»، وكلاهما صحيح.
 */
export function formatWithBase(
  amount: number,
  currency: string,
  money: MoneySettings,
  baseAmount?: number,
): string {
  const original = formatMoney(amount, currency)
  if (currency === money.base) return original

  const converted = baseAmount ?? toBase(amount, currency, money)
  return `${original} · ${formatMoney(converted, money.base)}`
}
