'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Chip } from '@/components/ui/pill'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/hints/empty-state'
import { Toast } from '@/components/ui/toast'
import { createProduct, deleteProduct, updateProduct } from '@/lib/actions'
import { CURRENCIES } from '@/lib/money'
import { cn, formatMoney } from '@/lib/utils'
import type { Product, ProductKind } from '@/lib/types'

const KINDS: { value: ProductKind; label: string; hint: string }[] = [
  { value: 'course', label: 'دورة', hint: 'تُباع مرة واحدة، ولها مسار الأكاديمية' },
  { value: 'subscription', label: 'اشتراك', hint: 'دخل شهري متكرر، ومساره الشركات' },
  { value: 'service', label: 'خدمة', hint: 'عمل يُنفَّذ لمرة واحدة، ومساره الشركات' },
]

/** ألوان اللوحة نفسها، ليبقى المنتج الجديد منسجماً مع بقية الواجهة */
const PALETTE = ['#5B4CE0', '#3B9BE8', '#7B61FF', '#F5A623', '#22C55E', '#0EA47A', '#E8639B', '#E5484D']

/** العرض خارج الأساس عمداً — انظر التعليق نفسه في add-payment */
const selectBase =
  'h-[38px] rounded-input border border-line bg-card px-3 text-body text-ink transition-colors duration-150 hover:border-[#D3D8E3] focus:border-accent focus:outline-none'

const selectClass = `w-full ${selectBase}`

export function ProductsManager({ products }: { products: Product[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState<Product | null>(null)
  const [creating, setCreating] = useState(false)
  const [removing, setRemoving] = useState<Product | null>(null)
  const [toast, setToast] = useState<{ msg: string; tone: 'error' | 'success' } | null>(null)

  const active = products.filter((p) => p.active)
  const stopped = products.filter((p) => !p.active)

  function toggle(p: Product) {
    startTransition(async () => {
      const res = await updateProduct(p.id, { active: !p.active })
      if (res.ok) {
        setToast({
          msg: p.active ? `أُوقف ${p.name}، ولن يظهر في قوائم الاختيار.` : `عاد ${p.name} للعمل.`,
          tone: 'success',
        })
        router.refresh()
      } else setToast({ msg: res.error ?? '', tone: 'error' })
    })
  }

  return (
    <>
      <div className="mb-6 flex justify-start">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          أضف منتجاً
        </Button>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title="لا توجد منتجات بعد"
          body="المنتج هو ما تبيعه: دورة أو اشتراك أو خدمة. أضف منتجاتك أولاً لتتمكّن من فتح صفقات عليها."
          action={<Button onClick={() => setCreating(true)}>أضف منتجاً</Button>}
        />
      ) : (
        <div className="space-y-8">
          <Row title="المنتجات الفعّالة" items={active} onEdit={setEditing} onToggle={toggle} onDelete={setRemoving} pending={pending} />
          {stopped.length > 0 && (
            <Row title="منتجات موقوفة" items={stopped} onEdit={setEditing} onToggle={toggle} onDelete={setRemoving} pending={pending} muted />
          )}
        </div>
      )}

      <ProductForm
        open={creating}
        onOpenChange={setCreating}
        onDone={(msg) => {
          setToast({ msg, tone: 'success' })
          router.refresh()
        }}
      />

      {editing && (
        <ProductForm
          key={editing.id}
          product={editing}
          open
          onOpenChange={(v) => !v && setEditing(null)}
          onDone={(msg) => {
            setEditing(null)
            setToast({ msg, tone: 'success' })
            router.refresh()
          }}
        />
      )}

      {/* الحذف: مسموح فقط لمنتج لم يُبنَ عليه شيء */}
      <Dialog open={Boolean(removing)} onOpenChange={(v) => !v && setRemoving(null)}>
        <DialogContent>
          <DialogTitle>حذف المنتج</DialogTitle>
          <DialogDescription>
            هل تريد حذف <strong className="text-ink">{removing?.name}</strong>؟ لا يمكن التراجع.
          </DialogDescription>
          <p className="mt-3 rounded-input bg-page p-4 text-sm leading-relaxed text-ink-muted">
            إن كانت عليه صفقات أو اشتراكات فلن يُحذف، وسنقترح إيقافه بدلاً من ذلك — الإيقاف
            يخفيه من قوائم الاختيار ويبقي تاريخه سليماً.
          </p>
          <div className="mt-5 flex justify-start gap-2">
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (!removing) return
                startTransition(async () => {
                  const res = await deleteProduct(removing.id)
                  if (res.ok) {
                    setToast({ msg: `حُذف ${removing.name}.`, tone: 'success' })
                    setRemoving(null)
                    router.refresh()
                  } else {
                    setToast({ msg: res.error ?? '', tone: 'error' })
                    setRemoving(null)
                  }
                })
              }}
            >
              {pending ? 'جارٍ الحذف…' : 'نعم، احذفه'}
            </Button>
            <Button variant="ghost" onClick={() => setRemoving(null)}>إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>

      {toast && <Toast message={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
    </>
  )
}

function Row({
  title, items, onEdit, onToggle, onDelete, pending, muted,
}: {
  title: string
  items: Product[]
  onEdit: (p: Product) => void
  onToggle: (p: Product) => void
  onDelete: (p: Product) => void
  pending: boolean
  muted?: boolean
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-section font-semibold text-ink">
        {title}
        <Chip tone="neutral" className="num">{items.length}</Chip>
      </h2>

      <Card className="divide-y divide-line-soft overflow-hidden">
        {items.map((p) => (
          <div key={p.id} className={cn('row flex flex-wrap items-center gap-3 px-4.5 py-3', muted && 'opacity-70')}>
            <span
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-chip text-white"
              style={{ backgroundColor: p.color }}
              aria-hidden
            >
              <Package className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-body-lg font-semibold text-ink">{p.name}</p>
              <p className="truncate text-faint text-ink-muted">
                {KINDS.find((k) => k.value === p.kind)?.label}
                {!p.active && ' · موقوف'}
              </p>
            </div>

            <span className="num w-[110px] shrink-0 text-[16px] font-bold text-ink">
              {p.default_price ? formatMoney(p.default_price, p.currency) : '—'}
            </span>

            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => onEdit(p)} disabled={pending}>
                <Pencil className="h-4 w-4" />
                عدّل
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onToggle(p)} disabled={pending}>
                <Power className="h-4 w-4" />
                {p.active ? 'أوقف' : 'فعّل'}
              </Button>
              <Button
                size="sm" variant="ghost" disabled={pending}
                onClick={() => onDelete(p)}
                className="text-ink-muted hover:bg-[#FEF3F2] hover:text-chip-danger-fg"
                aria-label={`احذف ${p.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </section>
  )
}

function ProductForm({
  product, open, onOpenChange, onDone,
}: {
  product?: Product
  open: boolean
  onOpenChange: (v: boolean) => void
  onDone: (message: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState(product?.name ?? '')
  const [kind, setKind] = useState<ProductKind>(product?.kind ?? 'course')
  const [price, setPrice] = useState(product?.default_price ? String(product.default_price) : '')
  const [currency, setCurrency] = useState(product?.currency ?? 'USD')
  const [color, setColor] = useState(product?.color ?? PALETTE[0])
  const [error, setError] = useState('')

  const isEdit = Boolean(product)

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setError('') }}>
      <DialogContent>
        <DialogTitle>{isEdit ? 'عدّل المنتج' : 'أضف منتجاً'}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? 'تعديل الاسم أو السعر لا يغيّر الصفقات المفتوحة، بل ما يأتي بعده.'
            : 'المنتج هو ما تبيعه. نوعه يحدّد المسار الذي تسير عليه صفقاته.'}
        </DialogDescription>

        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setError('')
            if (!name.trim()) return setError('أدخل اسم المنتج.')
            if (price && Number.isNaN(Number(price))) return setError('أدخل السعر بالأرقام فقط.')

            startTransition(async () => {
              const payload = {
                name,
                default_price: price ? Number(price) : undefined,
                color,
                currency,
              }
              const res = product
                ? await updateProduct(product.id, {
                    ...payload,
                    default_price: price ? Number(price) : null,
                  })
                : await createProduct({ ...payload, kind })

              if (res.ok) {
                onDone(isEdit ? `حُفظت تعديلات ${name.trim()}.` : `أُضيف ${name.trim()}.`)
                if (!isEdit) { setName(''); setPrice('') }
              } else {
                setError(res.error ?? '')
              }
            })
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="pr-name">اسم المنتج</Label>
            <Input
              id="pr-name" value={name} autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: دورة الذكاء الاصطناعي للأعمال"
            />
          </div>

          {!isEdit && (
            <div className="space-y-1">
              <Label htmlFor="pr-kind">النوع</Label>
              <select
                id="pr-kind" value={kind}
                onChange={(e) => setKind(e.target.value as ProductKind)}
                className={selectClass}
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
              <p className="text-xs leading-relaxed text-ink-muted">
                {KINDS.find((k) => k.value === kind)?.hint}
              </p>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="pr-price">السعر الافتراضي وعملته</Label>
            <div className="flex gap-2">
              <Input
                id="pr-price" value={price}
                className="num min-w-0 flex-1 text-right text-[17px] font-semibold"
                onChange={(e) => setPrice(e.target.value)}
                placeholder="250"
              />
              <select
                aria-label="عملة المنتج"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={`${selectBase} w-[108px] shrink-0 px-2`}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.short}</option>
                ))}
              </select>
            </div>
            <p className="text-xs leading-relaxed text-ink-muted">
              العملة هنا تنتقل إلى كل صفقة واشتراك على هذا المنتج، فلا تُختار في كل مرة.
              الدورات بالشيكل والاشتراكات بالدولار مثلاً.
            </p>
          </div>

          <div className="space-y-2">
            <Label>لون المنتج</Label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c} type="button" onClick={() => setColor(c)}
                  aria-label={`اللون ${c}`}
                  className={cn(
                    'h-8 w-8 rounded-input transition-transform duration-150 hover:scale-110',
                    color === c && 'ring-2 ring-accent ring-offset-2',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <FieldError>{error}</FieldError>

          <div className="flex justify-start gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'جارٍ الحفظ…' : isEdit ? 'احفظ التعديلات' : 'أضف المنتج'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
