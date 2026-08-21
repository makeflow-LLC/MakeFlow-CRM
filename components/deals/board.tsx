'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  closestCorners, DndContext, DragOverlay, MouseSensor, TouchSensor,
  useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/hints/empty-state'
import { Toast } from '@/components/ui/toast'
import { OwnerAvatar, ProductPill, StuckBadge } from '@/components/shared/bits'
import { Chip } from '@/components/ui/pill'
import { AddDeal } from '@/components/shared/add-dialogs'
import { DeleteDeal } from './delete-deal'
import { PaymentPrompt } from './payment-prompt'
import { emptyStates, microcopy } from '@/lib/hints'
import { cn, formatMoney, formatNumber } from '@/lib/utils'
import { STUCK_HOURS } from '@/lib/constants'
import type { DealCard, Product, Stage, User } from '@/lib/types'
import { KanbanSquare } from 'lucide-react'

interface Props {
  deals: DealCard[]
  stages: Stage[]
  products: Product[]
  users: User[]
  contacts: { id: string; full_name: string }[]
  /** عملة التقارير — المجاميع كلها بها، لا بعملة كل صفقة */
  baseCurrency: string
  live: boolean
}

export function DealsBoard({
  deals: initial, stages, products, users, contacts, baseCurrency, live,
}: Props) {
  const router = useRouter()

  /**
   * الخادم هو مصدر الحقيقة، والحالة المحلية تسبقه لحظة السحب فقط.
   * بدون هذه المزامنة تتجمّد اللوحة على أول تحميل: تبدّل المسار أو تضيف صفقة
   * فتبقى ترى القائمة القديمة — وهو ما يبدو وكأن الصفقات اختفت.
   */
  const [deals, setDeals] = useState(initial)
  useEffect(() => { setDeals(initial) }, [initial])

  // نحتفظ بأحدث ما جاء من الخادم للرجوع إليه عند فشل الحفظ
  const serverDeals = useRef(initial)
  useEffect(() => { serverDeals.current = initial }, [initial])
  const [dragging, setDragging] = useState<DealCard | null>(null)
  const [productFilter, setProductFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')

  // الصفقة الرايحة لمرحلة «خسرناه» — بتستنى سبب قبل ما تتحرك
  const [pendingLoss, setPendingLoss] = useState<{ deal: DealCard; stage: Stage } | null>(null)

  // الصفقة الواصلة لمرحلة دفع — نسأل عن المبلغ فوراً بدل أن يُدخَل مرتين
  const [pendingPayment, setPendingPayment] = useState<{ deal: DealCard; stage: Stage } | null>(null)
  const [lostReason, setLostReason] = useState('')
  const [reasonTouched, setReasonTouched] = useState(false)
  const [toast, setToast] = useState('')

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // على الهاتف: ضغطة قصيرة قبل السحب، وإلا تعارض السحب مع تمرير الصفحة
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  )

  const visible = useMemo(
    () =>
      deals.filter(
        (d) =>
          (!productFilter || d.product_id === productFilter) &&
          (!ownerFilter || d.owner_id === ownerFilter),
      ),
    [deals, productFilter, ownerFilter],
  )

  async function persist(dealId: string, stageId: string, reason?: string) {
    if (!live) return
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const db = createClient()
      const { error } = await db
        .from('deals')
        .update({ stage_id: stageId, ...(reason ? { lost_reason: reason } : {}) })
        .eq('id', dealId)
      if (error) throw error
      // نطلب من الخادم أحدث نسخة ليبقى العدّاد والمراحل مطابقين للواقع
      router.refresh()
    } catch {
      // الرجوع إلى آخر ما عرفه الخادم، لا إلى حالة فتح الصفحة —
      // وإلا تراجعت كل النقلات السابقة في الجلسة مع فشل نقلة واحدة
      setDeals(serverDeals.current)
      setToast(microcopy.errors.saveFailed)
    }
  }

  function moveDeal(deal: DealCard, stage: Stage, reason?: string) {
    setDeals((prev) =>
      prev.map((d) =>
        d.id === deal.id
          ? {
              ...d,
              stage_id: stage.id,
              stage,
              stage_entered_at: new Date().toISOString(),
              hours_in_stage: 0,
              status: stage.is_won ? 'won' : stage.is_lost ? 'lost' : 'open',
              lost_reason: reason ?? (stage.is_lost ? d.lost_reason : null),
            }
          : d,
      ),
    )
    void persist(deal.id, stage.id, reason)
  }

  function onDragEnd(event: DragEndEvent) {
    setDragging(null)
    const dealId = String(event.active.id)
    const stageId = event.over ? String(event.over.id) : null
    if (!stageId) return

    const deal = deals.find((d) => d.id === dealId)
    const stage = stages.find((s) => s.id === stageId)
    if (!deal || !stage || deal.stage_id === stage.id) return

    // القاعدة: ما يمكنك تخسر صفقة بدون ما تقول ليش
    if (stage.is_lost) {
      setPendingLoss({ deal, stage })
      setLostReason('')
      setReasonTouched(false)
      return
    }

    moveDeal(deal, stage)

    // بلغت مرحلة الدفع أو النجاح ولم يُسجَّل مقابلها كاملاً؟ اسأل الآن.
    if ((stage.is_paid_stage || stage.is_won) && deal.value - deal.paid_total > 0) {
      setPendingPayment({ deal, stage })
    }
  }

  function onDragStart(event: DragStartEvent) {
    setDragging(deals.find((d) => d.id === String(event.active.id)) ?? null)
  }

  if (!deals.length) {
    return (
      <EmptyState
        icon={<KanbanSquare className="h-7 w-7" />}
        title={emptyStates.deals.title}
        body={emptyStates.deals.body}
        action={<AddDeal contacts={contacts} products={products} label={emptyStates.deals.action} />}
      />
    )
  }

  return (
    <>
      {/* الفلاتر */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="h-[38px] rounded-input border border-line bg-card px-3 text-body font-semibold text-ink transition-colors duration-150 hover:bg-[#F4F5F8] focus:border-accent focus:outline-none"
        >
          <option value="">جميع المنتجات</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="h-[38px] rounded-input border border-line bg-card px-3 text-body font-semibold text-ink transition-colors duration-150 hover:bg-[#F4F5F8] focus:border-accent focus:outline-none"
        >
          <option value="">جميع المسؤولين</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.full_name}</option>
          ))}
        </select>

        {(productFilter || ownerFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setProductFilter('')
              setOwnerFilter('')
            }}
          >
            {microcopy.buttons.clearFilters}
          </Button>
        )}

        <span className="me-auto text-body text-ink-muted">
          <span className="num font-semibold text-ink">{formatNumber(visible.length)}</span> صفقة
          {' · '}
          <span className="num font-semibold text-ink">
            {formatMoney(visible.reduce((sum, d) => sum + d.value_base, 0), baseCurrency)}
          </span>
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        {/* الكمبيوتر: بورد أفقي. الموبايل: أعمدة فوق بعض */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:overflow-x-auto md:pb-4 scroll-slim">
          {stages.map((stage) => (
            <Column
              key={stage.id}
              stage={stage}
              baseCurrency={baseCurrency}
              deals={visible.filter((d) => d.stage_id === stage.id)}
            />
          ))}
          {/* حشوة نهاية البورد: تمنع قصّ آخر عمود عند أقصى التمرير */}
          <div className="hidden w-2 shrink-0 md:block" aria-hidden />
        </div>

        {/* حركة الإفلات: البطاقة تستقرّ في مكانها بدل أن تقفز إليه */}
        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.8,.3,1)' }}>
          {dragging ? <Card deal={dragging} overlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* المودال الحاجب: سبب الخسارة */}
      <Dialog
        open={Boolean(pendingLoss)}
        onOpenChange={(open) => {
          if (!open) setPendingLoss(null)
        }}
      >
        <DialogContent hideClose>
          <DialogTitle>{microcopy.lostReasonPrompt}</DialogTitle>
          <DialogDescription>{microcopy.lostReasonHelp}</DialogDescription>

          <div className="mt-4 space-y-1">
            <Textarea
              rows={3}
              autoFocus
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="مثال: السعر مرتفع بالنسبة له في هذه الفترة"
            />
            {reasonTouched && !lostReason.trim() && (
              <p className="text-xs font-medium text-danger">{microcopy.errors.lostReasonRequired}</p>
            )}
          </div>

          <div className="mt-4 flex justify-start gap-2">
            <Button
              variant="danger"
              onClick={() => {
                setReasonTouched(true)
                if (!lostReason.trim() || !pendingLoss) return
                moveDeal(pendingLoss.deal, pendingLoss.stage, lostReason.trim())
                setPendingLoss(null)
              }}
            >
              احفظ وانقل الصفقة
            </Button>
            <Button variant="ghost" onClick={() => setPendingLoss(null)}>
              {microcopy.buttons.cancel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {pendingPayment && (
        <PaymentPrompt
          key={pendingPayment.deal.id}
          deal={pendingPayment.deal}
          stageName={pendingPayment.stage.name}
          onClose={() => setPendingPayment(null)}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  )
}

function Column({
  stage, deals, baseCurrency,
}: { stage: Stage; deals: DealCard[]; baseCurrency: string }) {
  const { setNodeRef, isOver, active } = useDroppable({ id: stage.id })
  const total = deals.reduce((sum, d) => sum + d.value_base, 0)

  // العمود المصدر لا يُبرز كهدف: إعادة الإفلات في مكانها ليست نقلة
  const dragged = active ? String(active.id) : null
  const fromHere = dragged ? deals.some((d) => d.id === dragged) : false
  const targeted = isOver && !fromHere

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-full shrink-0 rounded-card bg-[#EFF1F5] p-2.5 transition-colors duration-200 md:w-[270px]',
        targeted && 'bg-accent-soft',
      )}
    >
      {/* ترويسة العمود: اسم المرحلة بلونها + العدد والمجموع */}
      <div
        className="mb-2.5 flex items-center gap-2 rounded-chip px-3 py-2"
        style={{ backgroundColor: stage.color }}
      >
        <span className="truncate text-body font-semibold text-white">{stage.name}</span>
        <span className="num shrink-0 rounded-pill bg-white/[.28] px-2 py-0.5 text-chip font-semibold text-white">
          {formatNumber(deals.length)}
        </span>
        <span className="num ms-auto shrink-0 text-chip font-semibold text-white/90">
          {formatMoney(total, baseCurrency)}
        </span>
      </div>

      <div className="space-y-2.5 md:min-h-[120px]">
        {deals.map((d) => <Card key={d.id} deal={d} />)}

        {/* مكان الاستقرار: يظهر أثناء التصويب على العمود */}
        {targeted && (
          <div
            className="rounded-[10px] border border-dashed border-accent bg-card/70 py-7 text-center text-chip font-semibold text-accent"
            aria-hidden
          >
            أفلتها هنا
          </div>
        )}

        {!deals.length && !targeted && (
          <p className="rounded-[10px] border border-dashed border-[#D9DEE7] py-6 text-center text-chip text-ink-faint">
            اسحب صفقة إلى هنا
          </p>
        )}
      </div>
    </div>
  )
}

function Card({ deal, overlay = false }: { deal: DealCard; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id })

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : listeners)}
      {...(overlay ? {} : attributes)}
      style={overlay ? undefined : { touchAction: 'manipulation' }}
      className={cn(
        'cursor-grab space-y-2 rounded-[10px] border border-line bg-card p-3.5 transition-colors duration-150 hover:border-accent active:cursor-grabbing',
        // البطاقة الأصلية تُخفى أثناء السحب: النسخة الطائرة تكفي، وبقاؤها باهتة يربك العين
        isDragging && 'invisible',
        overlay && 'border-accent shadow-pop',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/contacts/${deal.contact_id}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="truncate text-body-lg font-semibold text-ink hover:text-accent"
        >
          {deal.contact.full_name}
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          {!overlay && <DeleteDeal dealId={deal.id} />}
          <OwnerAvatar owner={deal.owner} />
        </div>
      </div>

      <ProductPill product={deal.product} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-2">
        <span className="num text-[15px] font-bold text-ink">
          {formatMoney(deal.value, deal.currency)}
        </span>
        {deal.status === 'open' && deal.hours_in_stage > STUCK_HOURS ? (
          <StuckBadge hours={deal.hours_in_stage} />
        ) : deal.paid_total > 0 && deal.paid_total < deal.value ? (
          <Chip tone="success" className="num">
            سُدّد {formatMoney(deal.paid_total)}
          </Chip>
        ) : null}
      </div>

      {deal.status === 'lost' && deal.lost_reason && (
        <p className="truncate rounded-chip bg-chip-danger-bg px-2 py-1 text-chip font-medium text-chip-danger-fg" title={deal.lost_reason}>
          {deal.lost_reason}
        </p>
      )}
    </div>
  )
}
