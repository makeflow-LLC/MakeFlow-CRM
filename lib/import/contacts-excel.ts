/**
 * استيراد جهات الاتصال من Excel.
 *
 * القالب والقارئ معرَّفان هنا معاً عن قصد: أي تعديل على الأعمدة يجب أن يطال
 * التوليد والقراءة في الوقت نفسه، وإبقاؤهما في ملف واحد يمنع انحرافهما.
 *
 * ExcelJS يُحمَّل عند الطلب فقط (dynamic import) حتى لا يدخل في حزمة الصفحات
 * التي لا تستورد شيئاً.
 */

import type { Contact, ContactSource, Product } from '@/lib/types'
import { isValidPhone, normalizePhone } from '@/lib/utils'

// ---------------------------------------------------------------------------
// تعريف القالب
// ---------------------------------------------------------------------------

export interface ColumnSpec {
  /** ترويسة العمود كما تظهر في الملف — هي المفتاح عند القراءة */
  header: string
  field: keyof ImportRow
  width: number
  required?: boolean
  hint: string
}

export const TEMPLATE_COLUMNS: ColumnSpec[] = [
  { header: 'الاسم الكامل', field: 'full_name', width: 28, required: true, hint: 'إلزامي — الاسم كما تناديه' },
  { header: 'رقم الهاتف', field: 'phone', width: 22, required: true, hint: 'إلزامي — بمقدّمة البلد ‎+970599123456‎، ورقمٌ يبدأ بصفر يُحسب فلسطينياً' },
  { header: 'البريد الإلكتروني', field: 'email', width: 26, hint: 'اختياري' },
  { header: 'المدينة', field: 'city', width: 16, hint: 'اختياري — غزة، خان يونس…' },
  { header: 'الجهة', field: 'organization_name', width: 24, hint: 'اختياري — اسم العيادة أو الشركة' },
  { header: 'الدور في الجهة', field: 'role_in_org', width: 20, hint: 'اختياري — صاحب العيادة، منسّقة…' },
  { header: 'المصدر', field: 'source', width: 18, hint: 'اختياري — بوت واتساب، إعلان فيسبوك، توصية، ورشة، إدخال يدوي' },
  { header: 'المنتج', field: 'product_name', width: 34, hint: 'اختياري — اسم الدورة أو الخدمة، وتُفتح به صفقة لكل شخص' },
  { header: 'ملاحظات', field: 'notes', width: 32, hint: 'اختياري' },
]

/** صف نموذجي يوضّح الصيغة المتوقّعة، ويُتخطّى تلقائياً عند القراءة. */
export const SAMPLE_ROW = [
  'أحمد صالح',
  '0599123456',
  'ahmad@example.com',
  'غزة',
  'عيادة النور',
  'مدير',
  'بوت واتساب',
  'دورة الأتمتة بالذكاء الاصطناعي (n8n)',
  'مهتم بدورة الأتمتة',
]

/** أسماء المصادر بالعربية ← قيم قاعدة البيانات */
const SOURCE_MAP: Record<string, ContactSource> = {
  'بوت واتساب': 'whatsapp_bot',
  'بوت الواتساب': 'whatsapp_bot',
  'واتساب': 'whatsapp_bot',
  'إعلان فيسبوك': 'facebook_ad',
  'اعلان فيسبوك': 'facebook_ad',
  'فيسبوك': 'facebook_ad',
  'توصية': 'referral',
  'ترشيح': 'referral',
  'ورشة': 'workshop',
  'إدخال يدوي': 'manual',
  'ادخال يدوي': 'manual',
  'يدوي': 'manual',
  'أخرى': 'other',
  'اخرى': 'other',
  // ما يكتبه الناس فعلاً حين يصدّرون من أدوات أجنبية
  'whatsapp': 'whatsapp_bot',
  'whatsapp bot': 'whatsapp_bot',
  'facebook': 'facebook_ad',
  'facebook ad': 'facebook_ad',
  'referral': 'referral',
  'workshop': 'workshop',
  'manual': 'manual',
  'other': 'other',
}

// ---------------------------------------------------------------------------
// أنواع نتيجة القراءة
// ---------------------------------------------------------------------------

export interface ImportRow {
  full_name: string
  phone: string
  email: string
  city: string
  organization_name: string
  role_in_org: string
  source: string
  product_name: string
  notes: string
}

export type RowStatus =
  | 'ready'
  | 'invalid'
  | 'duplicateInFile'
  | 'duplicateInSystem'
  /**
   * الشخص موجود سلفاً — إمّا في النظام أو في صفٍّ سابق من الملف نفسه —
   * والصف يحمل دورة جديدة له. لا نكرّر الشخص، بل نفتح له صفقتها.
   */
  | 'dealOnly'

export interface ParsedRow {
  /** رقم الصف في ملف Excel كما يراه المستخدم، ليتمكّن من تصحيحه */
  rowNumber: number
  raw: ImportRow
  /** الرقم بعد التوحيد إلى صيغة E.164 */
  normalizedPhone: string
  source: ContactSource
  /**
   * معرّفات المنتجات المذكورة في عمود «المنتج».
   * قائمة لا قيمة واحدة: الطالب الذي درس ثلاث دورات يُكتب في صف واحد
   * بأسماء مفصولة بفاصلة، فيخرج بثلاث صفقات وشخصٍ واحد.
   */
  productIds: string[]
  status: RowStatus
  /** سبب الرفض بالعربية، أو اسم السجل المكرّر */
  message: string
}

export interface ParseResult {
  rows: ParsedRow[]
  ready: number
  skipped: number
  /** كم صفقة ستُفتح مع الاستيراد */
  deals: number
}

// ---------------------------------------------------------------------------
// توليد القالب
// ---------------------------------------------------------------------------

/** يبني ملف Excel جاهزاً للتنزيل، بترويسة منسّقة وصف مثال وتعليقات توضيحية. */
export async function buildTemplate(): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Makeflow CRM'
  wb.created = new Date()

  const ws = wb.addWorksheet('جهات الاتصال', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 2 }],
  })

  // الصف 1: الترويسة
  ws.addRow(TEMPLATE_COLUMNS.map((c) => c.header))
  // الصف 2: شرح لكل عمود
  ws.addRow(TEMPLATE_COLUMNS.map((c) => c.hint))
  // الصف 3: مثال
  ws.addRow(SAMPLE_ROW)

  ws.columns = TEMPLATE_COLUMNS.map((c) => ({ width: c.width }))

  const header = ws.getRow(1)
  header.height = 26
  header.eachCell((cell, i) => {
    const spec = TEMPLATE_COLUMNS[i - 1]
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: spec?.required ? 'FF5B4CE0' : 'FF9AA4B2' },
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  const hints = ws.getRow(2)
  hints.height = 20
  hints.eachCell((cell) => {
    cell.font = { italic: true, size: 9, color: { argb: 'FF6B7280' } }
    cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true }
  })

  const sample = ws.getRow(3)
  sample.eachCell((cell) => {
    cell.font = { color: { argb: 'FF9AA4B2' } }
    cell.alignment = { horizontal: 'right' }
  })

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

// ---------------------------------------------------------------------------
// قراءة الملف والتحقق منه
// ---------------------------------------------------------------------------

const EMPTY_ROW: ImportRow = {
  full_name: '', phone: '', email: '', city: '',
  organization_name: '', role_in_org: '', source: '', product_name: '', notes: '',
}

/**
 * توحيد اسم المنتج قبل المقارنة.
 *
 * الأسماء تُكتب بيد بشر في ملف Excel: مسافات زائدة، وألف بهمزة وبدونها، وتاء
 * مربوطة مكان الهاء. المطابقة الحرفية كانت سترفض نصف الصفوف لأسباب إملائية
 * لا علاقة لها بالمقصود.
 */
/** الفواصل التي يستعملها الناس فعلاً بين اسمين في خانة واحدة */
const PRODUCT_SEPARATORS = /[,،;؛\n\r]+|\s\/\s|\s\+\s/

function productKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')   // التشكيل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ـ]/g, '')                      // التطويل
    .replace(/\s+/g, ' ')
}

const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    // ExcelJS يعيد كائنات للنص الغني والصيغ والروابط
    const v = value as { text?: string; result?: unknown; richText?: { text: string }[] }
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('').trim()
    if (typeof v.text === 'string') return v.text.trim()
    if (v.result !== undefined) return String(v.result).trim()
    return ''
  }
  return String(value).trim()
}

/**
 * يقرأ الملف ويصنّف كل صف. لا يكتب شيئاً — الهدف أن يرى المستخدم النتيجة
 * كاملة قبل أن يوافق على الحفظ.
 */
export async function parseContactsFile(
  file: File,
  existing: Pick<Contact, 'id' | 'full_name' | 'phone'>[],
  products: Pick<Product, 'id' | 'name'>[] = [],
): Promise<ParseResult> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const buffer = await file.arrayBuffer()

  if (file.name.toLowerCase().endsWith('.csv')) {
    const text = new TextDecoder('utf-8').decode(buffer)
    const ws = wb.addWorksheet('csv')
    text.split(/\r?\n/).forEach((line) => {
      if (line.trim()) ws.addRow(splitCsvLine(line))
    })
  } else {
    await wb.xlsx.load(buffer)
  }

  const ws = wb.worksheets[0]
  if (!ws) return { rows: [], ready: 0, skipped: 0, deals: 0 }

  // نطابق الأعمدة بترويستها لا بترتيبها، فإعادة ترتيب الأعمدة لا تكسر الاستيراد
  const headerRow = ws.getRow(1)
  const columnIndex = new Map<keyof ImportRow, number>()
  headerRow.eachCell((cell, col) => {
    const text = cellText(cell.value).replace(/\s+/g, ' ')
    const spec = TEMPLATE_COLUMNS.find((c) => c.header === text)
    if (spec) columnIndex.set(spec.field, col)
  })

  if (!columnIndex.has('full_name') || !columnIndex.has('phone')) {
    throw new Error('HEADERS_MISMATCH')
  }

  const byPhone = new Map(existing.map((c) => [c.phone, c]))
  const byProduct = new Map(products.map((p) => [productKey(p.name), p]))
  const seenInFile = new Map<string, number>()
  /** ما حُجز من منتجات لكل رقم في هذا الملف، لمنع تكرار الصفقة نفسها */
  const claimed = new Map<string, Set<string>>()
  const rows: ParsedRow[] = []

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return

    const raw = { ...EMPTY_ROW }
    columnIndex.forEach((col, field) => {
      raw[field] = cellText(row.getCell(col).value)
    })

    // نتخطّى صف الشرح وصف المثال الموجودين في القالب
    if (raw.full_name === 'الاسم الكامل' || raw.full_name.startsWith('إلزامي')) return
    if (raw.full_name === SAMPLE_ROW[0] && raw.phone === SAMPLE_ROW[1]) return

    // الصف الفارغ تماماً يُتجاهل بصمت
    if (!Object.values(raw).some((v) => v)) return

    const normalizedPhone = normalizePhone(raw.phone)
    const source = SOURCE_MAP[raw.source.trim()] ?? 'manual'

    /**
     * عمود المنتج قد يحمل أكثر من دورة، مفصولةً بفاصلة. وقد يتكرّر الشخص
     * نفسه في صفوف عدّة، صفٌّ لكل دورة، لأن هكذا تُصدَّر الكشوف عادةً.
     * الحالتان تعنيان الشيء نفسه: شخصٌ واحد وعدّة صفقات — ونقبلهما معاً
     * بدل إجبار المستخدم على إعادة ترتيب ثمانمئة صف.
     */
    const rawNames = raw.product_name
      .split(PRODUCT_SEPARATORS)
      .map((n) => n.trim())
      .filter(Boolean)

    const productIds: string[] = []
    const unknownNames: string[] = []

    for (const name of rawNames) {
      const product = byProduct.get(productKey(name))
      if (!product) {
        if (!unknownNames.includes(name)) unknownNames.push(name)
      } else if (!productIds.includes(product.id)) {
        productIds.push(product.id)
      }
    }

    const known = byPhone.get(normalizedPhone) ?? null
    const earlierRow = seenInFile.get(normalizedPhone)
    // ما سبق أن حجزناه لهذا الشخص في هذا الملف، حتى لا نفتح صفقتين لدورة واحدة
    const already = claimed.get(normalizedPhone)
    const fresh = productIds.filter((id) => !already?.has(id))

    let status: RowStatus = 'ready'
    let message = ''

    if (!raw.full_name) {
      status = 'invalid'
      message = 'الاسم مفقود'
    } else if (!raw.phone) {
      status = 'invalid'
      message = 'رقم الهاتف مفقود'
    } else if (!isValidPhone(raw.phone)) {
      status = 'invalid'
      message = 'أدخل الرقم بمقدّمة بلده، مثل ‎+970599123456‎'
    } else if (unknownNames.length) {
      // الرفض هنا مقصود: تمرير الصف بلا دورته يعني ضياعها صامتةً
      status = 'invalid'
      message =
        unknownNames.length === 1
          ? `لا يوجد منتج بالاسم «${unknownNames[0]}»`
          : `لا توجد منتجات بالأسماء: ${unknownNames.map((n) => `«${n}»`).join('، ')}`
    } else if (earlierRow !== undefined || known) {
      const who = known?.full_name ?? raw.full_name
      if (fresh.length) {
        status = 'dealOnly'
        message = known
          ? `${who} مسجَّل مسبقاً — ${dealsLabel(fresh.length)} فقط`
          : `مكرّر مع الصف ${earlierRow} — ${dealsLabel(fresh.length)} فقط`
      } else if (earlierRow !== undefined) {
        status = 'duplicateInFile'
        message = `مكرّر مع الصف ${earlierRow}`
      } else {
        status = 'duplicateInSystem'
        message = `مسجَّل باسم ${who}`
      }
    }

    if (status === 'ready') seenInFile.set(normalizedPhone, rowNumber)

    if (status === 'ready' || status === 'dealOnly') {
      const set = claimed.get(normalizedPhone) ?? new Set<string>()
      fresh.forEach((id) => set.add(id))
      claimed.set(normalizedPhone, set)
    }

    rows.push({
      rowNumber,
      raw,
      normalizedPhone,
      source,
      productIds: status === 'ready' || status === 'dealOnly' ? fresh : [],
      status,
      message,
    })
  })

  const ready = rows.filter((r) => r.status === 'ready').length
  const dealOnly = rows.filter((r) => r.status === 'dealOnly').length
  const deals = rows.reduce((sum, r) => sum + r.productIds.length, 0)

  return { rows, ready, skipped: rows.length - ready - dealOnly, deals }
}

/** «ستُفتح له صفقة واحدة / صفقتان / ٣ صفقات» — بصيغة الجمع العربية */
function dealsLabel(count: number): string {
  if (count === 1) return 'ستُفتح له صفقة واحدة'
  if (count === 2) return 'ستُفتح له صفقتان'
  return `ستُفتح له ${count} صفقات`
}

/** مُقسِّم CSV بسيط يحترم علامات الاقتباس المزدوجة */
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  out.push(current)
  return out
}
