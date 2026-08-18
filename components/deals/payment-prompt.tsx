'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Banknote } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/input'
import { createPayment } from '@/lib/actions'
import { formatMoney } from '@/lib/utils'
import type { DealCard } from '@/lib/types'

const METHODS = [
  { value: 'bank_transfer', label: 'حوالة بنكية' },
  { value: 'cash', label: 'نقداً' },
  { value: 'wallet', label: 'محفظة إلكترونية' },
  { value: 'other', label: 'أخرى' },
] as const

/**
 * السؤال الذي يلي نقل بطاقة إلى مرحلة الدفع.
 *
 * المرحلة والدفعة شيئان مختلفان في قاعدة البيانات، وهذا صحيح: المرحلة
 * موقعٌ على اللوحة، والدفعة مبلغ له تاريخ وطريقة. لكن مطالبة المستخدم
 * بإدخالهما مرتين هي التي تجعل التقارير تقول صفراً بينما المال وصل.
 * فنسأل هنا مرة واحدة، بمبلغٍ محسوب سلفاً، وضغطةٍ واحدة.
 */
export function PaymentPrompt({
  deal,
  stageName,
  onClose,
}: {
  deal: DealCard
  stageName: string
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const remaining = Math.max(deal.value - deal.paid_total, 0)
  const [amount, setAmount] = useState(String(remaining || deal.value))
  const [method, setMethod] = useState<(typeof METHODS)[number]['value']>('bank_transfer')
  const [error, setError] = useState('')

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogTitle>وصلك المبلغ؟</DialogTitle>
        <DialogDescription>
          نقلتَ صفقة <strong className="text-ink">{deal.contact.full_name}</strong> إلى مرحلة
          «{stageName}». سجّل الدفعة الآن لتظهر في المدفوعات والتقارير — المرحلة وحدها
          لا تُحتسب مالاً.
        </DialogDescription>

        <div className="mt-4 flex items-center gap-3 rounded-input bg-page p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-input bg-success/12 text-success">
            <Banknote className="h-5 w-5" />
          </span>
          <div className="min-w-0 text-sm">
            <p className="font-bold text-ink">{deal.product.name}</p>
            <p className="text-ink-muted">
              قيمة الصفقة <span className="num font-semibold text-ink">{formatMoney(deal.value, deal.currency)}</span>
              {deal.paid_total > 0 && (
                <>
                  ، سُدّد منها{' '}
                  <span className="num font-semibold text-ink">{formatMoney(deal.paid_total, deal.currency)}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setError('')
            const value = Number(amount)
            if (!(value > 0)) return setError('أدخل المبلغ بالأرقام.')

            startTransition(async () => {
              const res = await createPayment({
                deal_id: deal.id,
                amount: value,
                method,
                status: 'paid',
              })
              if (res.ok) {
                onClose()
                router.refresh()
              } else setError(res.error ?? '')
            })
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="pp-amount">المبلغ الذي وصلك</Label>
              <Input
                id="pp-amount" value={amount} inputMode="decimal" autoFocus
                className="num text-right"
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pp-method">الطريقة</Label>
              <select
                id="pp-method" value={method}
                onChange={(e) => setMethod(e.target.value as typeof method)}
                className="h-10 w-full rounded-input border border-line bg-card px-3 text-sm text-ink transition-colors duration-150 hover:border-[#D3D8E3] focus:border-accent focus:outline-none"
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <FieldError>{error}</FieldError>

          <div className="flex flex-wrap justify-start gap-2">
            <Button type="submit" variant="success" disabled={pending}>
              {pending ? 'جارٍ الحفظ…' : 'نعم، سجّل الدفعة'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              لم يصل بعد
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-ink-muted">
            إن لم يصل بعد، تبقى الصفقة في مكانها ويظهر مبلغها في «بِعته ولم تقبضه» بشاشة
            اليوم، فلا يضيع منك.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
