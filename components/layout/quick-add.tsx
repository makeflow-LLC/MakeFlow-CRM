'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label, Textarea } from '@/components/ui/input'
import { HintTooltip } from '@/components/hints/hint-tooltip'
import { microcopy } from '@/lib/hints'
import { isValidPhone, normalizePhone } from '@/lib/utils'
import type { Contact, Product } from '@/lib/types'

/**
 * الإضافة السريعة — 3 تبويبات، وكل تبويب 5 حقول كحد أقصى.
 *
 * أهم إشي فيها: حقل الهاتف بيدوّر على الرقم وقت الكتابة، وإذا كان مسجّل بيقترح
 * تفتح ملف الشخص بدل ما يعمل نسخة ثانية منه.
 */
export function QuickAdd({ contacts, products }: { contacts: Contact[]; products: Product[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={microcopy.buttons.quickAdd}
          title={microcopy.buttons.quickAdd}
          className="fixed bottom-20 left-4 z-40 flex h-14 w-14 items-center justify-center rounded-pill bg-accent text-white shadow-pop transition-all duration-150 hover:bg-accent-hover hover:scale-105 md:bottom-6 md:left-6"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>{microcopy.buttons.quickAdd}</DialogTitle>
        <DialogDescription>
          اختار شو بدك تضيف. كل تبويب فيه أقل عدد حقول ممكن — الباقي بتعبّيه بعدين.
        </DialogDescription>

        <Tabs defaultValue="contact" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="contact" className="flex-1">جهة اتصال</TabsTrigger>
            <TabsTrigger value="deal" className="flex-1">صفقة</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1">نشاط</TabsTrigger>
          </TabsList>

          <TabsContent value="contact" className="mt-4">
            <ContactForm contacts={contacts} onDone={() => setOpen(false)} />
          </TabsContent>
          <TabsContent value="deal" className="mt-4">
            <DealForm contacts={contacts} products={products} onDone={() => setOpen(false)} />
          </TabsContent>
          <TabsContent value="activity" className="mt-4">
            <ActivityForm contacts={contacts} onDone={() => setOpen(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

/** رسالة بتظهر بعد الحفظ بوضع المعاينة */
function DemoNote() {
  return (
    <p className="rounded-input bg-accent-soft p-3 text-xs leading-relaxed text-accent">
      إنت بوضع المعاينة، فالبيانات ما بتنحفظ. أول ما تربط Supabase بيشتغل الحفظ عادي.
    </p>
  )
}

function ContactForm({ contacts, onDone }: { contacts: Contact[]; onDone: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [touched, setTouched] = useState(false)
  const [saved, setSaved] = useState(false)

  // بندوّر على الرقم وقت الكتابة — قبل ما يضغط حفظ
  const duplicate = useMemo(() => {
    const normalized = normalizePhone(phone)
    if (normalized.length < 8) return null
    return contacts.find((c) => c.phone === normalized) ?? null
  }, [phone, contacts])

  const phoneError = touched && phone && !isValidPhone(phone) ? microcopy.errors.phoneFormat : ''
  const nameError = touched && !name.trim() ? microcopy.errors.nameRequired : ''

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        setTouched(true)
        if (!name.trim() || !isValidPhone(phone) || duplicate) return
        setSaved(true)
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="qa-name">الاسم</Label>
        <Input id="qa-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: أحمد صالح" />
        <FieldError>{nameError}</FieldError>
      </div>

      <div className="space-y-1">
        <Label htmlFor="qa-phone">رقم الهاتف</Label>
        <Input
          id="qa-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="0599123456"
          className="num text-right"
        />
        <FieldError>{phoneError}</FieldError>

        {duplicate && (
          <div className="flex items-center justify-between gap-3 rounded-input bg-warn/10 p-3">
            <p className="text-xs font-semibold leading-relaxed text-ink">
              {microcopy.duplicatePhone(duplicate.full_name)}
            </p>
            <Button asChild size="sm" variant="soft">
              <Link href={`/contacts/${duplicate.id}`} onClick={onDone}>
                {microcopy.buttons.openFile}
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="qa-city">المدينة</Label>
        <Input id="qa-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="غزة" />
      </div>

      {saved && <DemoNote />}

      <div className="flex justify-start gap-2">
        <Button type="submit" disabled={Boolean(duplicate)}>{microcopy.buttons.addContact}</Button>
        <Button type="button" variant="ghost" onClick={onDone}>{microcopy.buttons.cancel}</Button>
      </div>
    </form>
  )
}

function DealForm({
  contacts, products, onDone,
}: { contacts: Contact[]; products: Product[]; onDone: () => void }) {
  const [contactId, setContactId] = useState('')
  const [productId, setProductId] = useState('')
  const [value, setValue] = useState('')
  const [touched, setTouched] = useState(false)
  const [saved, setSaved] = useState(false)

  const valueError = touched && value && Number.isNaN(Number(value)) ? microcopy.errors.valueNumber : ''
  const productError = touched && !productId ? microcopy.errors.productRequired : ''

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        setTouched(true)
        if (!contactId || !productId || Number.isNaN(Number(value))) return
        setSaved(true)
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="qa-contact">مين العميل؟</Label>
        <select
          id="qa-contact"
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className="h-10 w-full rounded-input border border-line bg-card px-3 text-sm text-ink transition-colors duration-150 hover:border-[#D3D8E3] focus:border-accent focus:outline-none"
        >
          <option value="">اختار شخص…</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="qa-product">
          مهتم بأي منتج؟
          <HintTooltip term="deal" />
        </Label>
        <select
          id="qa-product"
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value)
            const p = products.find((x) => x.id === e.target.value)
            if (p?.default_price) setValue(String(p.default_price))
          }}
          className="h-10 w-full rounded-input border border-line bg-card px-3 text-sm text-ink transition-colors duration-150 hover:border-[#D3D8E3] focus:border-accent focus:outline-none"
        >
          <option value="">اختار منتج…</option>
          {products.filter((p) => p.active).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <FieldError>{productError}</FieldError>
      </div>

      <div className="space-y-1">
        <Label htmlFor="qa-value">قيمة الصفقة (شيكل)</Label>
        <Input
          id="qa-value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="250"
          className="num text-right"
        />
        <FieldError>{valueError}</FieldError>
      </div>

      {saved && <DemoNote />}

      <div className="flex justify-start gap-2">
        <Button type="submit">{microcopy.buttons.addDeal}</Button>
        <Button type="button" variant="ghost" onClick={onDone}>{microcopy.buttons.cancel}</Button>
      </div>
    </form>
  )
}

function ActivityForm({ contacts, onDone }: { contacts: Contact[]; onDone: () => void }) {
  const [contactId, setContactId] = useState('')
  const [type, setType] = useState('whatsapp')
  const [summary, setSummary] = useState('')
  const [saved, setSaved] = useState(false)

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!contactId || !summary.trim()) return
        setSaved(true)
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="qa-act-contact">مع مين كان التواصل؟</Label>
        <select
          id="qa-act-contact"
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className="h-10 w-full rounded-input border border-line bg-card px-3 text-sm text-ink transition-colors duration-150 hover:border-[#D3D8E3] focus:border-accent focus:outline-none"
        >
          <option value="">اختار شخص…</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="qa-act-type">
          نوع النشاط
          <HintTooltip term="activity" />
        </Label>
        <select
          id="qa-act-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-10 w-full rounded-input border border-line bg-card px-3 text-sm text-ink transition-colors duration-150 hover:border-[#D3D8E3] focus:border-accent focus:outline-none"
        >
          <option value="whatsapp">واتساب</option>
          <option value="call">مكالمة</option>
          <option value="meeting">اجتماع</option>
          <option value="note">ملاحظة</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="qa-act-summary">شو صار باختصار؟</Label>
        <Textarea
          id="qa-act-summary"
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="حكيت معه، قال رح يحوّل هالأسبوع"
        />
      </div>

      {saved && <DemoNote />}

      <div className="flex justify-start gap-2">
        <Button type="submit">{microcopy.buttons.addActivity}</Button>
        <Button type="button" variant="ghost" onClick={onDone}>{microcopy.buttons.cancel}</Button>
      </div>
    </form>
  )
}
