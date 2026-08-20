'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, UserPlus,
} from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/hints/empty-state'
import { importHints, microcopy } from '@/lib/hints'
import {
  buildTemplate, parseContactsFile, TEMPLATE_COLUMNS,
  type ParsedRow, type ParseResult, type RowStatus,
} from '@/lib/import/contacts-excel'
import { cn, CONTACT, DEAL, formatNumber, pluralize, ROW } from '@/lib/utils'
import { createDealsForImport } from '@/lib/actions'
import type { Contact, Product } from '@/lib/types'

const MAX_BYTES = 5 * 1024 * 1024

const STATUS_STYLE: Record<RowStatus, string> = {
  ready: 'bg-success/12 text-success',
  dealOnly: 'bg-accent-soft text-accent',
  invalid: 'bg-danger/10 text-danger',
  duplicateInFile: 'bg-warn/15 text-[#B26A00]',
  duplicateInSystem: 'bg-warn/15 text-[#B26A00]',
}

export function ImportWizard({
  contacts,
  products,
  live,
}: {
  contacts: Pick<Contact, 'id' | 'full_name' | 'phone'>[]
  products: Pick<Product, 'id' | 'name'>[]
  live: boolean
}) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)

  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<ParseResult | null>(null)
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState<number | null>(null)
  const [dealsCreated, setDealsCreated] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  async function downloadTemplate() {
    const blob = await buildTemplate()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    // اسم لاتيني: أسماء الملفات العربية تتحوّل إلى رموز مشوّهة على بعض الأنظمة
    a.download = 'makeflow-contacts-template.xlsx'
    document.body.appendChild(a)
    a.click()

    // الإبطال الفوري يسبق بدء التنزيل أحياناً فيفقد المتصفح اسم الملف
    setTimeout(() => {
      a.remove()
      URL.revokeObjectURL(url)
    }, 1000)
  }

  async function handleFile(file: File) {
    setError('')
    setResult(null)
    setImported(null)

    const name = file.name.toLowerCase()
    if (!name.endsWith('.xlsx') && !name.endsWith('.csv')) {
      setError(microcopy.errors.fileType)
      return
    }
    if (file.size > MAX_BYTES) {
      setError(microcopy.errors.fileTooLarge)
      return
    }

    setFileName(file.name)
    setReading(true)
    try {
      const parsed = await parseContactsFile(file, contacts, products)
      if (!parsed.rows.length) {
        setError(microcopy.errors.fileEmpty)
        return
      }
      setResult(parsed)
    } catch (e) {
      setError(
        e instanceof Error && e.message === 'HEADERS_MISMATCH'
          ? microcopy.errors.fileHeaders
          : microcopy.errors.loadFailed,
      )
    } finally {
      setReading(false)
    }
  }

  async function runImport() {
    if (!result) return
    const rows = result.rows.filter((r) => r.status === 'ready')
    const dealRows = result.rows.filter(
      (r) => (r.status === 'ready' || r.status === 'dealOnly') && r.productIds.length,
    )
    if (!rows.length && !dealRows.length) return

    setImporting(true)
    try {
      if (live) {
        const { createClient } = await import('@/lib/supabase/client')
        const db = createClient()

        // الجهات أولاً: نحتاج معرّفاتها لربط الأشخاص بها
        const orgNames = Array.from(
          new Set(rows.map((r) => r.raw.organization_name.trim()).filter(Boolean)),
        )
        const orgIds = new Map<string, string>()

        for (const name of orgNames) {
          const { data: found } = await db
            .from('organizations').select('id').ilike('name', name).limit(1)

          if (found?.[0]) {
            orgIds.set(name, found[0].id)
          } else {
            const { data: created, error } = await db
              .from('organizations').insert({ name, type: 'other' }).select('id').single()
            if (error) throw error
            if (created) orgIds.set(name, created.id)
          }
        }

        const { data: inserted, error } = await db.from('contacts').insert(
          rows.map((r) => ({
            full_name: r.raw.full_name,
            phone: r.normalizedPhone,
            email: r.raw.email || null,
            city: r.raw.city || null,
            organization_id: orgIds.get(r.raw.organization_name.trim()) ?? null,
            role_in_org: r.raw.role_in_org || null,
            source: r.source,
            notes: r.raw.notes || null,
          })),
        ).select('id, phone')
        if (error) throw error

        /**
         * الصفقات بعد الأشخاص، ومرتبطةً بالرقم لا بترتيب الصفوف: الصف قد
         * يخصّ شخصاً أُنشئ للتوّ، أو شخصاً مسجّلاً من قبل، أو شخصاً ورد في
         * صفٍّ سابق من الملف نفسه — والرقم هو ما يجمع الثلاثة.
         */
        const idByPhone = new Map<string, string>([
          ...contacts.map((c) => [c.phone, c.id] as const),
          ...(inserted ?? []).map((c) => [c.phone as string, c.id as string] as const),
        ])

        const pairs = dealRows.flatMap((r) => {
          const contactId = idByPhone.get(r.normalizedPhone)
          if (!contactId) return []
          return r.productIds.map((product_id) => ({ contact_id: contactId, product_id }))
        })

        if (pairs.length) {
          const res = await createDealsForImport(pairs)
          if (!res.ok) throw new Error(res.error ?? '')
          setDealsCreated(res.created)
        }
      }

      setImported(rows.length)
      setResult(null)
      if (live) router.refresh()
    } catch {
      setError(microcopy.errors.saveFailed)
    } finally {
      setImporting(false)
    }
  }

  // ---- بعد نجاح الاستيراد -------------------------------------------------
  if (imported !== null) {
    return (
      <Card className="p-2">
        <EmptyState
          tone="done"
          icon={<CheckCircle2 className="h-7 w-7" />}
          title={importHints.done(pluralize(imported, CONTACT))}
          body={
            live
              ? dealsCreated > 0
                ? `تجدهم في قائمة جهات الاتصال، وفُتحت ${pluralize(dealsCreated, DEAL)} على المنتجات المذكورة في الملف — تراها على لوحة الصفقات.`
                : 'تجدهم الآن في قائمة جهات الاتصال.'
              : microcopy.demoNote
          }
          action={
            <div className="flex gap-2">
              <Button onClick={() => router.push('/contacts')}>افتح جهات الاتصال</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setImported(null)
                  setFileName('')
                }}
              >
                استورد ملفاً آخر
              </Button>
            </div>
          }
        />
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* الخطوات الثلاث */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StepCard
          index={1}
          title={importHints.steps.download.title}
          body={importHints.steps.download.body}
          action={
            <Button onClick={downloadTemplate} variant="soft" size="sm">
              <Download className="h-4 w-4" />
              {microcopy.buttons.downloadTemplate}
            </Button>
          }
        />
        <StepCard
          index={2}
          title={importHints.steps.fill.title}
          body={importHints.steps.fill.body}
        />
        <StepCard
          index={3}
          title={importHints.steps.upload.title}
          body={importHints.steps.upload.body}
        />
      </div>

      {/* أعمدة القالب */}
      <Card>
        <CardHeader>
          <CardTitle>أعمدة القالب</CardTitle>
          <span className="text-xs text-ink-muted">لا تغيّر أسماء الأعمدة</span>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_COLUMNS.map((c) => (
              <span
                key={c.header}
                title={c.hint}
                className={cn(
                  'rounded-pill px-3 py-1 text-xs font-semibold',
                  c.required ? 'bg-accent text-white' : 'bg-page text-ink-muted',
                )}
              >
                {c.header}
                {c.required && ' *'}
              </span>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-ink-muted">
            الأعمدة البنفسجية إلزامية. {importHints.phoneNote}
          </p>

          {/* أسماء المنتجات كما هي مسجَّلة — تُنسخ إلى الملف بدل تخمين الإملاء */}
          {products.length > 0 && (
            <div className="rounded-input bg-page p-4">
              <p className="mb-2 text-xs font-bold text-ink">
                اكتب في عمود «المنتج» أحد هذه الأسماء بالضبط:
              </p>
              <div className="flex flex-wrap gap-2">
                {products.map((p) => (
                  <span
                    key={p.id}
                    className="rounded-pill border border-line bg-card px-3 py-1 text-xs font-semibold text-ink"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                من درس أكثر من دورة: اكتب دوراته في الخانة نفسها مفصولةً بفاصلة، أو ضعه في
                صفٍّ لكل دورة — كلاهما يعطي شخصاً واحداً وصفقةً لكل دورة.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* منطقة الرفع */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file) handleFile(file)
        }}
        className={cn(
          'flex flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-12 text-center transition-colors duration-150',
          dragOver ? 'border-accent bg-accent-soft' : 'border-line bg-card',
        )}
      >
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-card bg-page text-ink-muted">
          {reading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-6 w-6" />
          )}
        </span>

        <p className="mb-1 text-base font-bold text-ink">
          {reading ? 'جارٍ فحص الملف…' : fileName || 'اسحب الملف إلى هنا'}
        </p>
        <p className="mb-4 max-w-md text-sm leading-relaxed text-ink-muted">
          بصيغة ‎.xlsx‎ أو ‎.csv‎، وبحد أقصى 5 ميغابايت. سنعرض عليك النتيجة قبل الحفظ.
        </p>

        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
        <Button onClick={() => fileInput.current?.click()} disabled={reading}>
          <Upload className="h-4 w-4" />
          {microcopy.buttons.chooseFile}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-card border border-danger/25 bg-danger/[0.04] p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <p className="text-sm font-semibold leading-relaxed text-danger">{error}</p>
        </div>
      )}

      {/* المعاينة قبل الحفظ */}
      {result ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>معاينة قبل الحفظ</CardTitle>
            <span className="text-sm font-semibold text-ink-muted">
              {importHints.summary(pluralize(result.ready, ROW), pluralize(result.skipped, ROW))}
              {result.deals > 0 && (
                <> · <span className="text-accent">{pluralize(result.deals, DEAL)}</span> ستُفتح</>
              )}
            </span>
          </CardHeader>

          <div className="hidden items-center gap-4 border-b border-line bg-page/60 px-6 py-3 text-xs font-bold text-ink-muted lg:flex">
            <span className="w-[52px]">الصف</span>
            <span className="flex-1">الاسم</span>
            <span className="w-[150px]">الهاتف</span>
            <span className="w-[150px]">المنتج</span>
            <span className="w-[220px]">الحالة</span>
          </div>

          <div className="max-h-[420px] divide-y divide-line overflow-y-auto scroll-slim">
            {result.rows.map((row) => (
              <PreviewRow key={row.rowNumber} row={row} />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4">
            <p className="text-xs leading-relaxed text-ink-muted">
              {result.skipped > 0
                ? 'الصفوف غير الجاهزة ستُتخطّى ولن تُحفظ. صحّحها في الملف وأعد رفعه إن أردت إدراجها. أمّا الصفوف الزرقاء فليست متخطّاة: صاحبها مسجَّل مسبقاً وستُفتح له صفقات دوراته فقط.'
                : 'جميع الصفوف جاهزة.'}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={runImport}
                disabled={importing || (result.ready === 0 && result.deals === 0)}
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {importing
                  ? 'جارٍ الاستيراد…'
                  : `${microcopy.buttons.startImport} (${formatNumber(result.ready)})`}
              </Button>
              <Button variant="ghost" onClick={() => setResult(null)}>
                {microcopy.buttons.cancel}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        !error &&
        !reading && (
          <EmptyState
            icon={<FileSpreadsheet className="h-7 w-7" />}
            title={importHints.emptyPreview.title}
            body={importHints.emptyPreview.body}
          />
        )
      )}
    </div>
  )
}

function StepCard({
  index, title, body, action,
}: {
  index: number
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <Card className="flex h-full flex-col gap-3 p-6">
      <span className="num flex h-8 w-8 items-center justify-center rounded-pill bg-accent-soft text-sm font-bold text-accent">
        {index}
      </span>
      <p className="text-base font-bold text-ink">{title}</p>
      <p className="flex-1 text-sm leading-relaxed text-ink-muted">{body}</p>
      {action}
    </Card>
  )
}

function PreviewRow({ row }: { row: ParsedRow }) {
  const ok = row.status === 'ready'
  return (
    <div
      className={cn(
        'row flex flex-wrap items-center gap-4 px-6 py-3',
        !ok && 'bg-page/50',
      )}
    >
      <span className="num w-[52px] text-xs font-bold text-ink-muted">{row.rowNumber}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
        {row.raw.full_name || '—'}
      </span>
      <span className="num w-[150px] truncate text-sm text-ink-muted">
        {row.normalizedPhone || row.raw.phone || '—'}
      </span>
      <span
        className="hidden w-[150px] truncate text-sm text-ink-muted lg:block"
        title={row.raw.product_name}
      >
        {row.raw.product_name || '—'}
      </span>
      <span className="flex w-[220px] items-center gap-2">
        <span className={cn('rounded-pill px-3 py-1 text-xs font-bold', STATUS_STYLE[row.status])}>
          {importHints.rowStatus[row.status]}
        </span>
        {row.message && (
          <span className="truncate text-xs text-ink-muted" title={row.message}>
            {row.message}
          </span>
        )}
      </span>
    </div>
  )
}
