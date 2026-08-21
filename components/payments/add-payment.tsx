'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label, Textarea } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Toast } from '@/components/ui/toast'
import { createPayment } from '@/lib/actions'
import { formatMoney } from '@/lib/utils'
import { CURRENCIES, symbolFor, type MoneySettings } from '@/lib/money'
import type { DealCard } from '@/lib/types'

const METHODS = [
  { value: 'bank_transfer', label: 'حوالة بنكية' },
  { value: 'cash', label: 'نقداً' },
  { value: 'wallet', label: 'محفظة إلكترونية' },
  { value: 'other', label: 'أخرى' },
] as const

const STATUSES = [
  { value: 'paid', label: 'وصلني المبلغ وتأكّدت منه', hint: 'يُحتسب في الإيرادات، وتتقدّم الصفقة تلقائياً' },
  { value: 'needs_checking', label: 'أرسل إيصالاً ولم أتأكّد بعد', hint: 'يظهر في «بانتظار التحقق» حتى تؤكّده' },
] as const

/**
 * العرض ليس جزءاً من الأساس عمداً: القائمة الملاصقة لخانة مبلغ تأخذ عرضاً
 * ضيّقاً، ولو كان `w-full` هنا لتغلّب عليه — الصنفان يتعارضان والترتيب في
 * ملف الأنماط هو الذي يحسم، لا ترتيبهما في السطر.
 */
const selectBase =
  'h-[38px] rounded-input border border-line bg-card px-3 text-body text-ink transition-colors duration-150 hover:border-[#D3D8E3] focus:border-accent focus:outline-none'

const selectClass = `w-full ${selectBase}`

/** التاريخ والوقت الحاليان بصيغة datetime-local */
function nowLocal(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

/**
 * تسجيل دفعة.
 *
 * الصفقة تُختار أولاً، لأن الدفعة لا تعيش وحدها — كل مبلغ مقابل شيء بيع.
 * وبعد الاختيار نعرض المتبقّي على الصفقة ونقترحه مبلغاً، فالحالة الغالبة
 * أن يدفع العميل ما عليه كاملاً.
 */
export function AddPayment({
  deals,
  money,
  presetDealId,
  label = 'سجّل دفعة',
  variant = 'primary',
}: {
  deals: DealCard[]
  money: MoneySettings
  presetDealId?: string
  label?: string
  variant?: 'primary' | 'outline' | 'soft'
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [dealId, setDealId] = useState(presetDealId ?? '')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<(typeof METHODS)[number]['value']>('bank_transfer')
  const [status, setStatus] = useState<(typeof STATUSES)[number]['value']>('paid')
  const [paidAt, setPaidAt] = useState(nowLocal())
  const [note, setNote] = useState('')
  const [currency, setCurrency] = useState(money.base)
  const [rate, setRate] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const open_deals = useMemo(
    () => deals.filter((d) => d.status === 'open' || d.paid_total > 0),
    [deals],
  )

  const deal = open_deals.find((d) => d.id === dealId)
  const remaining = deal ? Math.max(deal.value - deal.paid_total, 0) : 0

  function pickDeal(id: string) {
    setDealId(id)
    const d = open_deals.find((x) => x.id === id)
    if (!d) return
    // نقترح المتبقّي، وللمستخدم أن يغيّره إن كانت دفعة جزئية
    setAmount(String(Math.max(d.value - d.paid_total, 0) || d.value))
    // والعملة تتبع الصفقة، فالغالب أن يُقبض بما سُعِّر به
    pickCurrency(d.currency)
  }

  function pickCurrency(code: string) {
    setCurrency(code)
    setRate(code === money.base ? '' : String(money.rates[code] ?? ''))
  }

  /** ما سيدخل التقارير — يُعرض قبل الحفظ لا بعده */
  const rateNumber = Number(rate)
  const baseAmount =
    currency === money.base
      ? Number(amount)
      : rateNumber > 0
        ? Number(amount) / rateNumber
        : 0

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError('') }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto scroll-slim">
          <DialogTitle>تسجيل دفعة</DialogTitle>
          <DialogDescription>
            المبلغ يُسجَّل على صفقة بعينها. نقل البطاقة إلى مرحلة «دفع» وحده لا يكفي —
            الإيرادات تُحتسب من هنا.
          </DialogDescription>

          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              setError('')
              if (!dealId) return setError('اختر الصفقة.')
              const value = Number(amount)
              if (!(value > 0)) return setError('أدخل المبلغ بالأرقام.')
              if (currency !== money.base && !(rateNumber > 0)) {
                return setError('أدخل سعر الصرف يوم وصول المبلغ.')
              }

              startTransition(async () => {
                const res = await createPayment({
                  deal_id: dealId,
                  amount: value,
                  currency,
                  fx_rate: currency === money.base ? undefined : rateNumber,
                  method,
                  status,
                  paid_at: status === 'paid' ? new Date(paidAt).toISOString() : undefined,
                  note,
                })

                if (res.ok) {
                  setOpen(false)
                  setAmount(''); setNote('')
                  setToast(
                    status === 'paid'
                      ? `سُجّلت دفعة ${formatMoney(value, currency)} وتقدّمت الصفقة.`
                      : `سُجّلت دفعة ${formatMoney(value, currency)} بانتظار تحقّقك منها.`,
                  )
                  router.refresh()
                } else setError(res.error ?? '')
              })
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="ap-deal">الصفقة</Label>
              <select
                id="ap-deal" value={dealId}
                onChange={(e) => pickDeal(e.target.value)}
                className={selectClass}
              >
                <option value="">اختر الصفقة…</option>
                {open_deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.contact.full_name} — {d.product.name}
                  </option>
                ))}
              </select>
              {deal && (
                <p className="text-xs leading-relaxed text-ink-muted">
                  قيمة الصفقة <span className="num font-semibold text-ink">{formatMoney(deal.value, deal.currency)}</span>
                  {deal.paid_total > 0 && (
                    <>
                      ، سُدّد منها <span className="num font-semibold text-ink">{formatMoney(deal.paid_total, deal.currency)}</span>،
                      والمتبقّي <span className="num font-semibold text-ink">{formatMoney(remaining, deal.currency)}</span>
                    </>
                  )}
                  .
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="ap-amount">المبلغ المقبوض وعملته</Label>
              <div className="flex gap-2">
                <Input
                  id="ap-amount" value={amount} inputMode="decimal"
                  className="num min-w-0 flex-1 text-right text-[17px] font-semibold"
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="150"
                />
                <select
                  aria-label="عملة المبلغ"
                  value={currency}
                  onChange={(e) => pickCurrency(e.target.value)}
                  className={`${selectBase} w-[108px] shrink-0 px-2`}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.short}</option>
                  ))}
                </select>
              </div>
              <p className="text-chip leading-relaxed text-ink-muted">
                سجّل ما وصلك فعلاً بعملته. لا تحوّله بنفسك — النظام يفعل ذلك ويحفظ الأصل.
              </p>
            </div>

            {/* عملة غير الأساس: السعر يُطلب هنا ويُثبَّت على الدفعة إلى الأبد */}
            {currency !== money.base && (
              <div className="space-y-1 rounded-input bg-page p-4">
                <Label htmlFor="ap-rate">
                  سعر الصرف يوم وصول المبلغ — 1 {symbolFor(money.base)} {money.base} =
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="ap-rate" value={rate} inputMode="decimal"
                    className="num min-w-0 flex-1 text-right"
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="3.70"
                  />
                  <span className="shrink-0 text-body font-semibold text-ink-muted">
                    {symbolFor(currency)} {currency}
                  </span>
                </div>
                {baseAmount > 0 && (
                  <p className="text-faint font-semibold text-chip-success-fg">
                    سيُحتسب في التقارير: {formatMoney(baseAmount, money.base)}
                  </p>
                )}
                <p className="text-chip leading-relaxed text-ink-muted">
                  السعر يُثبَّت على هذه الدفعة، فلا يتغيّر رقمها لاحقاً مهما تحرّك السوق.
                </p>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="ap-method">طريقة الدفع</Label>
              <select
                id="ap-method" value={method}
                onChange={(e) => setMethod(e.target.value as typeof method)}
                className={selectClass}
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>الحالة</Label>
              {STATUSES.map((s) => (
                <label
                  key={s.value}
                  className="flex cursor-pointer items-start gap-3 rounded-input border border-line p-3 transition-colors duration-150 hover:bg-page"
                >
                  <input
                    type="radio" name="ap-status" value={s.value}
                    checked={status === s.value}
                    onChange={() => setStatus(s.value)}
                    className="mt-1 h-4 w-4 accent-[#5B4CE0]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{s.label}</span>
                    <span className="block text-xs leading-relaxed text-ink-muted">{s.hint}</span>
                  </span>
                </label>
              ))}
            </div>

            {status === 'paid' && (
              <div className="space-y-1">
                <Label htmlFor="ap-date">تاريخ وصول المبلغ</Label>
                <Input
                  id="ap-date" type="datetime-local" value={paidAt} dir="ltr"
                  className="num text-left"
                  onChange={(e) => setPaidAt(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="ap-note">ملاحظة (اختياري)</Label>
              <Textarea
                id="ap-note" rows={2} value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثال: حوالة على حساب بنك فلسطين، رقم المرجع 44219"
              />
            </div>

            <FieldError>{error}</FieldError>

            <div className="flex justify-start gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? 'جارٍ الحفظ…' : 'سجّل الدفعة'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {toast && <Toast message={toast} tone="success" onClose={() => setToast('')} />}
    </>
  )
}
