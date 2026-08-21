'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Coins, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Toast } from '@/components/ui/toast'
import { setCurrencyRate } from '@/lib/actions'
import { symbolFor } from '@/lib/money'
import { formatDate } from '@/lib/utils'

export interface RateRow {
  code: string
  units_per_base: number
  updated_at: string
}

/**
 * عملة التقارير وأسعار الصرف.
 *
 * موضعها فوق التقارير مقصود: هي التي تحدّد معنى كل رقم تحتها. ولا ربط
 * بخدمة أسعار حيّة — شركة من ثلاثة أشخاص تحدّث السعر حين يتحرّك فعلاً،
 * والربط الآلي يجلب تعقيداً بلا مقابل.
 */
export function CurrencyCard({ base, rates }: { base: string; rates: RateRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState<RateRow | null>(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const others = rates.filter((r) => r.code !== base)

  return (
    <>
      <Card className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 p-4.5">
        <span className="flex items-center gap-2.5">
          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-chip bg-chip-accent-bg text-chip-accent-fg">
            <Coins className="h-4 w-4" />
          </span>
          <span className="text-body text-ink-muted">
            كل الأرقام هنا بـ
            <strong className="text-ink"> {symbolFor(base)} {base}</strong>
          </span>
        </span>

        <span className="flex flex-wrap items-center gap-2">
          {others.map((r) => (
            <button
              key={r.code}
              type="button"
              onClick={() => { setEditing(r); setValue(String(r.units_per_base)); setError('') }}
              className="group flex items-center gap-2 rounded-input border border-line px-3 py-1.5 text-faint transition-colors duration-150 hover:border-accent"
              title={`آخر تحديث ${formatDate(r.updated_at)}`}
            >
              <span className="num font-semibold text-ink">
                1 {symbolFor(base)} = {r.units_per_base} {symbolFor(r.code)}
              </span>
              <Pencil className="h-3.5 w-3.5 text-ink-faint transition-colors duration-150 group-hover:text-accent" />
            </button>
          ))}
        </span>

        <span className="ms-auto max-w-md text-chip leading-relaxed text-ink-faint">
          تغيير السعر يمسّ ما يأتي بعده فقط. كل دفعة مسجَّلة تحمل سعر يومها ولا تتحرّك.
        </span>
      </Card>

      <Dialog open={Boolean(editing)} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogTitle>سعر صرف {editing?.code}</DialogTitle>
          <DialogDescription>
            كم وحدة من {editing?.code} تساوي وحدة واحدة من {base}؟
          </DialogDescription>

          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              setError('')
              const rate = Number(value)
              if (!(rate > 0)) return setError('أدخل رقماً أكبر من صفر.')
              if (!editing) return

              startTransition(async () => {
                const res = await setCurrencyRate(editing.code, rate)
                if (res.ok) {
                  setEditing(null)
                  setToast(`حُدّث السعر: 1 ${base} = ${rate} ${editing.code}.`)
                  router.refresh()
                } else setError(res.error ?? '')
              })
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="rate-value">
                1 {symbolFor(base)} {base} =
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="rate-value" value={value} autoFocus inputMode="decimal"
                  className="num text-right"
                  onChange={(e) => setValue(e.target.value)}
                />
                <span className="shrink-0 text-body font-semibold text-ink-muted">
                  {editing && symbolFor(editing.code)} {editing?.code}
                </span>
              </div>
              <p className="text-chip leading-relaxed text-ink-muted">
                مثال: إن كان الدولار يساوي 3.70 شيكلاً، فاكتب 3.70.
              </p>
            </div>

            <FieldError>{error}</FieldError>

            <div className="flex justify-start gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? 'جارٍ الحفظ…' : 'احفظ السعر'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>إلغاء</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {toast && <Toast message={toast} tone="success" onClose={() => setToast('')} />}
    </>
  )
}
