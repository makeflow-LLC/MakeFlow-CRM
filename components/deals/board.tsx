'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/hints/empty-state'
import { Toast } from '@/components/ui/toast'
import { OwnerAvatar, ProductPill, StuckBadge } from '@/components/shared/bits'
import { AddDeal } from '@/components/shared/add-dialogs'
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
  live: boolean
}

export function DealsBoard({ deals: initial, stages, products, users, contacts, live }: Props) {
  const [deals, setDeals] = useState(initial)
  const [dragging, setDragging] = useState<DealCard | null>(null)
  const [productFilter, setProductFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')

  // الصفقة الرايحة لمرحلة «خسرناه» — بتستنى سبب قبل ما تتحرك
  const [pendingLoss, setPendingLoss] = useState<{ deal: DealCard; stage: Stage } | null>(null)
  const [lostReason, setLostReason] = useState('')
  const [reasonTouched, setReasonTouched] = useState(false)
  const [toast, setToast] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

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
    } catch {
      // تعود البطاقة إلى مكانها الأصلي إن فشل الحفظ
      setDeals(initial)
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
          className="h-10 rounded-input border border-line bg-card px-3 text-sm font-semibold text-ink transition-colors duration-150 hover:border-[#D3D8E3] focus:border-accent focus:outline-none"
        >
          <option value="">جميع المنتجات</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="h-10 rounded-input border border-line bg-card px-3 text-sm font-semibold text-ink transition-colors duration-150 hover:border-[#D3D8E3] focus:border-accent focus:outline-none"
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

        <span className="me-auto text-sm text-ink-muted">
          <span className="num">{formatNumber(visible.length)}</span> صفقة
        </span>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        {/* الكمبيوتر: بورد أفقي. الموبايل: أعمدة فوق بعض */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:overflow-x-auto md:pb-4 scroll-slim">
          {stages.map((stage) => (
            <Column key={stage.id} stage={stage} deals={visible.filter((d) => d.stage_id === stage.id)} />
          ))}
          {/* حشوة نهاية البورد: تمنع قصّ آخر عمود عند أقصى التمرير */}
          <div className="hidden w-2 shrink-0 md:block" aria-hidden />
        </div>

        <DragOverlay dropAnimation={null}>
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

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  )
}

function Column({ stage, deals }: { stage: Stage; deals: DealCard[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const total = deals.reduce((sum, d) => sum + d.value, 0)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-full shrink-0 rounded-card transition-colors duration-150 md:w-[280px]',
        isOver && 'bg-accent-soft',
      )}
    >
      {/* ترويسة العمود: اسم المرحلة بلونها + العدد والمجموع */}
      <div className="mb-3 rounded-card px-3 py-2" style={{ backgroundColor: stage.color }}>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-bold text-white">{stage.name}</span>
          <span className="num rounded-pill bg-white/25 px-2 py-0.5 text-xs font-bold text-white">
            {formatNumber(deals.length)}
          </span>
        </div>
        <p className="num mt-0.5 text-xs font-semibold text-white/85">{formatMoney(total)}</p>
      </div>

      <div className="space-y-3 md:min-h-[120px]">
        {deals.map((d) => <Card key={d.id} deal={d} />)}

        {!deals.length && (
          <p className="rounded-card border border-dashed border-line py-6 text-center text-xs text-ink-muted">
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
      className={cn(
        'surface cursor-grab space-y-2 p-3 transition-shadow duration-150 hover:shadow-pop active:cursor-grabbing',
        isDragging && 'opacity-40',
        overlay && 'rotate-2 shadow-pop',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/contacts/${deal.contact_id}`}
          onClick={(e) => e.stopPropagation()}
          className="truncate text-sm font-bold text-ink hover:text-accent"
        >
          {deal.contact.full_name}
        </Link>
        <OwnerAvatar owner={deal.owner} />
      </div>

      <ProductPill product={deal.product} />

      <div className="flex items-center justify-between gap-2">
        <span className="num text-sm font-bold text-ink">{formatMoney(deal.value, deal.currency)}</span>
        {deal.paid_total > 0 && deal.paid_total < deal.value && (
          <span className="text-[11px] font-semibold text-success">
            المسدَّد <span className="num">{formatMoney(deal.paid_total)}</span>
          </span>
        )}
      </div>

      {deal.status === 'open' && deal.hours_in_stage > STUCK_HOURS && (
        <StuckBadge hours={deal.hours_in_stage} />
      )}

      {deal.status === 'lost' && deal.lost_reason && (
        <p className="truncate rounded-input bg-danger/8 px-2 py-1 text-[11px] text-danger" title={deal.lost_reason}>
          {deal.lost_reason}
        </p>
      )}
    </div>
  )
}
