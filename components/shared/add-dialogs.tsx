'use client'

/**
 * نوافذ الإضافة المشتركة.
 *
 * كانت أزرار الشاشات الفارغة بلا سلوك، فيضغطها المستخدم ولا يحدث شيء —
 * وهو أسوأ من غياب الزر. كل زر هنا يفتح نافذة تحفظ فعلاً، وتُستعمل النافذة
 * نفسها من الشاشة الفارغة ومن ترويسة الشاشة على السواء.
 */

import { useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/input'
import { createContact, createDeal, createSubscription } from '@/lib/actions'
import { microcopy } from '@/lib/hints'
import { isValidPhone, normalizePhone } from '@/lib/utils'
import { PhoneInput } from '@/components/ui/phone-input'
import type { Contact, Organization, Product } from '@/lib/types'

const selectClass =
  'h-10 w-full rounded-input border border-line bg-card px-3 text-sm text-ink transition-colors duration-150 hover:border-[#D3D8E3] focus:border-accent focus:outline-none'

type Size = 'sm' | 'md'

// ---------------------------------------------------------------------------
// جهة اتصال
// ---------------------------------------------------------------------------

export function AddContact({
  contacts,
  label = microcopy.buttons.addContact,
  size = 'md',
}: {
  contacts: Pick<Contact, 'id' | 'full_name' | 'phone'>[]
  label?: string
  size?: Size
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState('')

  const duplicate = useMemo(() => {
    const n = normalizePhone(phone)
    if (n.length < 8) return null
    return contacts.find((c) => c.phone === n) ?? null
  }, [phone, contacts])

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError('') }}>
      <DialogTrigger asChild>
        <Button size={size}>
          <Plus className="h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>أضف جهة اتصال</DialogTitle>
        <DialogDescription>
          الاسم ورقم الهاتف يكفيان للبدء. الباقي تستكمله لاحقاً من ملف الشخص.
        </DialogDescription>

        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setTouched(true)
            setError('')
            if (!name.trim() || !isValidPhone(phone) || duplicate) return

            startTransition(async () => {
              const res = await createContact({ full_name: name, phone, city })
              if (res.ok) {
                setName(''); setPhone(''); setCity(''); setTouched(false)
                setOpen(false)
                router.refresh()
              } else {
                setError(res.error ?? '')
              }
            })
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="ac-name">الاسم</Label>
            <Input
              id="ac-name" value={name} autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: أحمد صالح"
            />
            <FieldError>{touched && !name.trim() ? microcopy.errors.nameRequired : ''}</FieldError>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ac-phone">رقم الهاتف</Label>
            <PhoneInput
              id="ac-phone" value={phone}
              onChange={setPhone}
              onBlur={() => setTouched(true)}
            />
            <FieldError>
              {touched && phone && !isValidPhone(phone) ? microcopy.errors.phoneFormat : ''}
            </FieldError>

            {duplicate && (
              <div className="flex items-center justify-between gap-3 rounded-input bg-warn/10 p-3">
                <p className="text-xs font-semibold leading-relaxed text-ink">
                  {microcopy.duplicatePhone(duplicate.full_name)}
                </p>
                <Button asChild size="sm" variant="soft">
                  <Link href={`/contacts/${duplicate.id}`} onClick={() => setOpen(false)}>
                    {microcopy.buttons.openFile}
                  </Link>
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="ac-city">المدينة</Label>
            <Input id="ac-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="غزة" />
          </div>

          <FieldError>{error}</FieldError>

          <div className="flex justify-start gap-2">
            <Button type="submit" disabled={pending || Boolean(duplicate)}>
              {pending ? 'جارٍ الحفظ…' : microcopy.buttons.addContact}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {microcopy.buttons.cancel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// صفقة
// ---------------------------------------------------------------------------

export function AddDeal({
  contacts,
  products,
  presetContactId,
  label = microcopy.buttons.addDeal,
  size = 'md',
}: {
  contacts: Pick<Contact, 'id' | 'full_name'>[]
  products: Product[]
  /** عند الفتح من ملف عميل، العميل معروف مسبقاً فلا نسأل عنه */
  presetContactId?: string
  label?: string
  size?: Size
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [contactId, setContactId] = useState(presetContactId ?? '')
  const [productId, setProductId] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const active = products.filter((p) => p.active)

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError('') }}>
      <DialogTrigger asChild>
        <Button size={size}>
          <Plus className="h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>أضف صفقة</DialogTitle>
        <DialogDescription>
          الصفقة اهتمام شخص واحد بمنتج واحد. ستبدأ في أول مرحلة على المسار المناسب.
        </DialogDescription>

        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setError('')
            if (!contactId) return setError('اختر العميل.')
            if (!productId) return setError(microcopy.errors.productRequired)
            if (value && Number.isNaN(Number(value))) return setError(microcopy.errors.valueNumber)

            startTransition(async () => {
              const res = await createDeal({
                contact_id: contactId,
                product_id: productId,
                value: value ? Number(value) : undefined,
              })
              if (res.ok) {
                setProductId(''); setValue('')
                if (!presetContactId) setContactId('')
                setOpen(false)

                // المسار يتبع نوع المنتج، وقد يكون غير اللوحة المفتوحة —
                // فننقل المستخدم إليها بدل أن يبحث عن صفقة يظنّها ضاعت
                if (res.pipelineId && pathname === '/deals') {
                  router.push(`/deals?pipeline=${res.pipelineId}`)
                }
                router.refresh()
              } else {
                setError(res.error ?? '')
              }
            })
          }}
        >
          {!presetContactId && (
            <div className="space-y-1">
              <Label htmlFor="ad-contact">من العميل؟</Label>
              <select
                id="ad-contact" value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className={selectClass}
              >
                <option value="">اختر شخصاً…</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="ad-product">ما المنتج محلّ الاهتمام؟</Label>
            <select
              id="ad-product" value={productId} autoFocus
              onChange={(e) => {
                setProductId(e.target.value)
                const p = active.find((x) => x.id === e.target.value)
                if (p?.default_price) setValue(String(p.default_price))
              }}
              className={selectClass}
            >
              <option value="">اختر منتجاً…</option>
              {active.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ad-value">قيمة الصفقة</Label>
            <Input
              id="ad-value" value={value} className="num text-right"
              onChange={(e) => setValue(e.target.value)}
              placeholder="250"
            />
          </div>

          <FieldError>{error}</FieldError>

          <div className="flex justify-start gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'جارٍ الحفظ…' : microcopy.buttons.addDeal}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {microcopy.buttons.cancel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// اشتراك
// ---------------------------------------------------------------------------

export function AddSubscription({
  organizations,
  contacts,
  products,
  label = microcopy.buttons.addSubscription,
}: {
  organizations: Pick<Organization, 'id' | 'name'>[]
  contacts: Pick<Contact, 'id' | 'full_name'>[]
  products: Product[]
  label?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [holder, setHolder] = useState('')          // "org:<id>" أو "contact:<id>"
  const [productId, setProductId] = useState('')
  const [amount, setAmount] = useState('')
  const [renewal, setRenewal] = useState('')
  const [error, setError] = useState('')

  const recurring = products.filter((p) => p.active && p.kind !== 'course')

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError('') }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>أضف اشتراكاً</DialogTitle>
        <DialogDescription>
          الاشتراك دخل شهري متكرر. سجّله بعد التعاقد لتتابع موعد التجديد.
        </DialogDescription>

        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setError('')
            if (!holder) return setError('اختر الجهة أو الشخص صاحب الاشتراك.')
            if (!productId) return setError(microcopy.errors.productRequired)
            if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
              return setError('أدخل المبلغ الشهري بالأرقام.')
            }

            const [kind, id] = holder.split(':')

            startTransition(async () => {
              const res = await createSubscription({
                product_id: productId,
                monthly_amount: Number(amount),
                organization_id: kind === 'org' ? id : undefined,
                contact_id: kind === 'contact' ? id : undefined,
                renewal_date: renewal || undefined,
              })
              if (res.ok) {
                setHolder(''); setProductId(''); setAmount(''); setRenewal('')
                setOpen(false)
                router.refresh()
              } else {
                setError(res.error ?? '')
              }
            })
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="as-holder">صاحب الاشتراك</Label>
            <select
              id="as-holder" value={holder} autoFocus
              onChange={(e) => setHolder(e.target.value)}
              className={selectClass}
            >
              <option value="">اختر جهة أو شخصاً…</option>
              {organizations.length > 0 && (
                <optgroup label="الجهات">
                  {organizations.map((o) => (
                    <option key={o.id} value={`org:${o.id}`}>{o.name}</option>
                  ))}
                </optgroup>
              )}
              {contacts.length > 0 && (
                <optgroup label="الأشخاص">
                  {contacts.map((c) => (
                    <option key={c.id} value={`contact:${c.id}`}>{c.full_name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="as-product">المنتج</Label>
            <select
              id="as-product" value={productId}
              onChange={(e) => {
                setProductId(e.target.value)
                const p = recurring.find((x) => x.id === e.target.value)
                if (p?.default_price) setAmount(String(p.default_price))
              }}
              className={selectClass}
            >
              <option value="">اختر منتجاً…</option>
              {recurring.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="as-amount">المبلغ الشهري</Label>
            <Input
              id="as-amount" value={amount} className="num text-right"
              onChange={(e) => setAmount(e.target.value)}
              placeholder="250"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="as-renewal">موعد التجديد القادم</Label>
            <Input
              id="as-renewal" type="date" value={renewal}
              onChange={(e) => setRenewal(e.target.value)}
              className="num"
            />
            <p className="text-xs text-ink-muted">إن تركته فارغاً، سنعتبره بعد شهر من اليوم.</p>
          </div>

          <FieldError>{error}</FieldError>

          <div className="flex justify-start gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'جارٍ الحفظ…' : microcopy.buttons.addSubscription}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {microcopy.buttons.cancel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
