'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Receipt, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/hints/empty-state'
import { HintTooltip } from '@/components/hints/hint-tooltip'
import { emptyStates, microcopy } from '@/lib/hints'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import type { PaymentRow, PaymentStatus } from '@/lib/types'

const FILTERS: { key: PaymentStatus | 'all'; label: string }[] = [
  { key: 'needs_checking', label: 'تحتاج تحقق' },
  { key: 'paid', label: 'مؤكدة' },
  { key: 'not_paid', label: 'غير مدفوعة' },
  { key: 'all', label: 'الكل' },
]

const STATUS_STYLE: Record<PaymentStatus, string> = {
  paid: 'bg-success/12 text-success',
  needs_checking: 'bg-warn/15 text-[#B26A00]',
  not_paid: 'bg-page text-ink-muted',
  refunded: 'bg-danger/10 text-danger',
}

const STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: 'مؤكدة',
  needs_checking: 'تحتاج تحقق',
  not_paid: 'غير مدفوعة',
  refunded: 'مرتجعة',
}

export function PaymentsTable({ rows: initial, live }: { rows: PaymentRow[]; live: boolean }) {
  // الفلتر الافتراضي: اللي محتاج شغل منك
  const [filter, setFilter] = useState<PaymentStatus | 'all'>('needs_checking')
  const [rows, setRows] = useState(initial)
  const [preview, setPreview] = useState<PaymentRow | null>(null)

  const visible = useMemo(
    () => (filter === 'all' ? rows : rows.filter((p) => p.status === filter)),
    [rows, filter],
  )

  async function decide(payment: PaymentRow, status: PaymentStatus) {
    setRows((prev) => prev.map((p) => (p.id === payment.id ? { ...p, status } : p)))

    if (!live) return
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const db = createClient()
      const { error } = await db
        .from('payments')
        .update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null })
        .eq('id', payment.id)
      if (error) throw error
    } catch {
      setRows(initial)
      alert(microcopy.errors.saveFailed)
    }
  }

  const counts = (key: PaymentStatus | 'all') =>
    key === 'all' ? rows.length : rows.filter((p) => p.status === key).length

  return (
    <>
      <div className="mb-4 inline-flex flex-wrap items-center gap-1 rounded-input border border-line bg-card p-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'flex items-center gap-2 rounded-[6px] px-4 py-2 text-sm font-semibold transition-all duration-150',
              filter === f.key ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink',
            )}
          >
            {f.label}
            <span
              className={cn(
                'num rounded-pill px-2 py-0.5 text-[11px] font-bold',
                filter === f.key ? 'bg-white/25 text-white' : 'bg-page text-ink-muted',
              )}
            >
              {counts(f.key)}
            </span>
          </button>
        ))}
      </div>

      {visible.length ? (
        <Card className="divide-y divide-line overflow-hidden">
          {visible.map((p) => (
            <div key={p.id} className="row flex flex-wrap items-center gap-4 px-6 py-3">
              {/* صورة الإيصال — بتكبر بالضغط */}
              <button
                type="button"
                onClick={() => setPreview(p)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-input border border-line bg-page text-ink-muted transition-colors duration-150 hover:border-accent hover:text-accent"
                aria-label="افتح الإيصال"
              >
                <Receipt className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <Link href={`/contacts/${p.contact.id}`} className="truncate text-sm font-bold text-ink hover:text-accent">
                  {p.contact.full_name}
                </Link>
                <p className="truncate text-xs text-ink-muted">
                  {p.product.name} · {formatDate(p.paid_at ?? p.created_at)}
                </p>
              </div>

              <span className="num text-base font-bold text-ink">{formatMoney(p.amount, p.currency)}</span>

              <span className={cn('rounded-pill px-3 py-1 text-xs font-bold', STATUS_STYLE[p.status])}>
                {STATUS_LABEL[p.status]}
              </span>

              {p.status === 'needs_checking' && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="success" onClick={() => decide(p, 'paid')}>
                    <Check className="h-4 w-4" />
                    {microcopy.buttons.confirm}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide(p, 'not_paid')}>
                    <X className="h-4 w-4" />
                    {microcopy.buttons.reject}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </Card>
      ) : (
        <EmptyState
          tone={filter === 'needs_checking' ? 'done' : 'empty'}
          icon={<Receipt className="h-7 w-7" />}
          title={emptyStates.payments.title}
          body={emptyStates.payments.body}
        />
      )}

      {/* معاينة الإيصال */}
      <Dialog open={Boolean(preview)} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent>
          <DialogTitle>إيصال {preview?.contact.full_name}</DialogTitle>
          <div className="mt-4 space-y-4">
            {preview?.receipt_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.receipt_url} alt="الإيصال" className="w-full rounded-input border border-line" />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-input bg-page py-12 text-center">
                <Receipt className="mb-3 h-10 w-10 text-ink-muted" />
                <p className="text-sm font-semibold text-ink">ما في صورة إيصال مرفقة</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-ink-muted">
                  لما العميل يبعت صورة الإيصال عبر البوت، بتظهر هون وبتقدر تكبّرها.
                </p>
              </div>
            )}

            {preview && (
              <dl className="space-y-2 rounded-input bg-page p-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-muted">المبلغ</dt>
                  <dd className="num font-bold text-ink">{formatMoney(preview.amount, preview.currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted">المنتج</dt>
                  <dd className="font-semibold text-ink">{preview.product.name}</dd>
                </div>
                {preview.note && (
                  <div className="flex justify-between gap-4">
                    <dt className="shrink-0 text-ink-muted">ملاحظة</dt>
                    <dd className="text-ink">{preview.note}</dd>
                  </div>
                )}
              </dl>
            )}

            {preview?.status === 'needs_checking' && (
              <div className="flex gap-2">
                <Button
                  variant="success"
                  onClick={() => {
                    decide(preview, 'paid')
                    setPreview(null)
                  }}
                >
                  <Check className="h-4 w-4" />
                  {microcopy.buttons.confirm}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    decide(preview, 'not_paid')
                    setPreview(null)
                  }}
                >
                  {microcopy.buttons.reject}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
