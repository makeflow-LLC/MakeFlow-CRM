/**
 * استيراد جهات الاتصال من Excel.
 *
 * القالب والقارئ معرَّفان هنا معاً عن قصد: أي تعديل على الأعمدة يجب أن يطال
 * التوليد والقراءة في الوقت نفسه، وإبقاؤهما في ملف واحد يمنع انحرافهما.
 *
 * ExcelJS يُحمَّل عند الطلب فقط (dynamic import) حتى لا يدخل في حزمة الصفحات
 * التي لا تستورد شيئاً.
 */

import type { Contact, ContactSource } from '@/lib/types'
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
  { header: 'رقم الهاتف', field: 'phone', width: 22, required: true, hint: 'إلزامي — 0599123456 أو ‎+970599123456‎' },
  { header: 'البريد الإلكتروني', field: 'email', width: 26, hint: 'اختياري' },
  { header: 'المدينة', field: 'city', width: 16, hint: 'اختياري — غزة، خان يونس…' },
  { header: 'الجهة', field: 'organization_name', width: 24, hint: 'اختياري — اسم العيادة أو الشركة' },
  { header: 'الدور في الجهة', field: 'role_in_org', width: 20, hint: 'اختياري — صاحب العيادة، منسّقة…' },
  { header: 'المصدر', field: 'source', width: 18, hint: 'اختياري — بوت واتساب، إعلان فيسبوك، توصية، ورشة، إدخال يدوي' },
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
  notes: string
}

export type RowStatus = 'ready' | 'invalid' | 'duplicateInFile' | 'duplicateInSystem'

export interface ParsedRow {
  /** رقم الصف في ملف Excel كما يراه المستخدم، ليتمكّن من تصحيحه */
  rowNumber: number
  raw: ImportRow
  /** الرقم بعد التوحيد إلى صيغة E.164 */
  normalizedPhone: string
  source: ContactSource
  status: RowStatus
  /** سبب الرفض بالعربية، أو اسم السجل المكرّر */
  message: string
}

export interface ParseResult {
  rows: ParsedRow[]
  ready: number
  skipped: number
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
  organization_name: '', role_in_org: '', source: '', notes: '',
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
  if (!ws) return { rows: [], ready: 0, skipped: 0 }

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
  const seenInFile = new Map<string, number>()
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
      message = 'الرقم يجب أن يبدأ بـ ‎+970‎ أو ‎+972‎'
    } else if (seenInFile.has(normalizedPhone)) {
      status = 'duplicateInFile'
      message = `مكرّر مع الصف ${seenInFile.get(normalizedPhone)}`
    } else if (byPhone.has(normalizedPhone)) {
      status = 'duplicateInSystem'
      message = `مسجَّل باسم ${byPhone.get(normalizedPhone)!.full_name}`
    }

    if (status === 'ready') seenInFile.set(normalizedPhone, rowNumber)

    rows.push({ rowNumber, raw, normalizedPhone, source, status, message })
  })

  const ready = rows.filter((r) => r.status === 'ready').length
  return { rows, ready, skipped: rows.length - ready }
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
