/**
 * أرقام الهاتف.
 *
 * الرقم يُخزَّن دائماً بصيغة E.164 كاملة: علامة زائد، ثم مقدّمة البلد، ثم
 * الرقم — ‎+970599123456‎. هذا شرط قاعدة البيانات نفسها، وهو ما يجعل الرقم
 * مفتاحاً صالحاً لتمييز الشخص: نفس الشخص لا يُسجَّل مرتين لأنه كتب رقمه
 * مرة بـ ‎0599‎ ومرة بـ ‎+970599‎.
 *
 * كانت الواجهة تفترض ‎+970‎ ضمناً لكل رقم يبدأ بصفر. الافتراض صحيح غالباً
 * وخاطئ صمتاً حين لا يكون كذلك، فصار اختيار البلد ظاهراً في الحقل.
 */

export interface Country {
  /** مقدّمة البلد بلا علامة زائد */
  dial: string
  name: string
  /** رمز ISO — للمفتاح فقط، فقد تتشارك دولٌ المقدّمة نفسها */
  code: string
}

/**
 * فلسطين أولاً لأنها الافتراضي، ثم ما يليها ممّا يتعامل معه المكتب فعلاً،
 * ثم البقية بترتيب أبجدي.
 */
export const COUNTRIES: Country[] = [
  { dial: '970', name: 'فلسطين', code: 'PS' },
  { dial: '972', name: 'إسرائيل', code: 'IL' },
  { dial: '20', name: 'مصر', code: 'EG' },
  { dial: '962', name: 'الأردن', code: 'JO' },
  { dial: '966', name: 'السعودية', code: 'SA' },
  { dial: '971', name: 'الإمارات', code: 'AE' },
  { dial: '90', name: 'تركيا', code: 'TR' },
  { dial: '213', name: 'الجزائر', code: 'DZ' },
  { dial: '973', name: 'البحرين', code: 'BH' },
  { dial: '216', name: 'تونس', code: 'TN' },
  { dial: '253', name: 'جيبوتي', code: 'DJ' },
  { dial: '249', name: 'السودان', code: 'SD' },
  { dial: '963', name: 'سوريا', code: 'SY' },
  { dial: '252', name: 'الصومال', code: 'SO' },
  { dial: '964', name: 'العراق', code: 'IQ' },
  { dial: '968', name: 'عُمان', code: 'OM' },
  { dial: '974', name: 'قطر', code: 'QA' },
  { dial: '965', name: 'الكويت', code: 'KW' },
  { dial: '961', name: 'لبنان', code: 'LB' },
  { dial: '218', name: 'ليبيا', code: 'LY' },
  { dial: '212', name: 'المغرب', code: 'MA' },
  { dial: '222', name: 'موريتانيا', code: 'MR' },
  { dial: '967', name: 'اليمن', code: 'YE' },
  { dial: '44', name: 'المملكة المتحدة', code: 'GB' },
  { dial: '1', name: 'الولايات المتحدة / كندا', code: 'US' },
  { dial: '49', name: 'ألمانيا', code: 'DE' },
  { dial: '33', name: 'فرنسا', code: 'FR' },
  { dial: '39', name: 'إيطاليا', code: 'IT' },
  { dial: '46', name: 'السويد', code: 'SE' },
  { dial: '31', name: 'هولندا', code: 'NL' },
  { dial: '32', name: 'بلجيكا', code: 'BE' },
  { dial: '61', name: 'أستراليا', code: 'AU' },
  { dial: '60', name: 'ماليزيا', code: 'MY' },
  { dial: '62', name: 'إندونيسيا', code: 'ID' },
]

export const DEFAULT_DIAL = '970'

/**
 * الاسم مع المقدّمة، والمقدّمة معزولة اتجاهياً.
 *
 * بدون العزل يقفز الزائد إلى الطرف الخطأ داخل نصٍّ عربي: ‎970+‎ بدل ‎+970‎.
 */
export function countryLabel(c: Country): string {
  return `${c.name} ⁦+${c.dial}⁩`
}

/** أطول مقدّمة تنطبق أولاً، فـ ‎+9709…‎ لا تُقرأ على أنها ‎+970‎ إن وُجد الأخصّ. */
const BY_LENGTH = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)

/** يفصل رقماً كاملاً إلى مقدّمة وباقٍ، ليملأ الحقلين عند التعديل. */
export function splitPhone(e164: string | null | undefined): { dial: string; local: string } {
  const digits = (e164 ?? '').replace(/[^0-9+]/g, '').replace(/^\+/, '')
  if (!digits) return { dial: DEFAULT_DIAL, local: '' }

  const match = BY_LENGTH.find((c) => digits.startsWith(c.dial))
  if (!match) return { dial: DEFAULT_DIAL, local: digits }

  return { dial: match.dial, local: digits.slice(match.dial.length) }
}

/**
 * يركّب الرقم الكامل.
 *
 * الصفر الأول في الجزء المحلي صفر داخليّ لا يدخل في الصيغة الدولية —
 * ‎0599‎ في فلسطين تصير ‎+970599‎ لا ‎+9700599‎ — فنسقطه.
 */
export function joinPhone(dial: string, local: string): string {
  const rest = local.replace(/\D/g, '').replace(/^0+/, '')
  if (!rest) return ''
  return `+${dial.replace(/\D/g, '')}${rest}`
}

/** نفس الشرط المكتوب في قاعدة البيانات، حرفاً بحرف. */
export function isE164(phone: string): boolean {
  return /^\+[1-9][0-9]{6,14}$/.test(phone)
}
