'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Play, Square, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Toast } from '@/components/ui/toast'
import {
  deleteSubscription, endSubscription, resumeSubscription, subscriptionDeletionImpact,
} from '@/lib/actions'
import { formatMoney } from '@/lib/utils'

type Impact = Awaited<ReturnType<typeof subscriptionDeletionImpact>>

/**
 * إنهاء الاشتراك أو حذفه.
 *
 * الإجراءان يبدوان متشابهين وهما ليسا كذلك، فيُعرضان بوضوح مختلف: الإنهاء
 * زرٌّ عادي لأنه الصواب في الحالة الغالبة (العميل توقّف)، والحذف أيقونة
 * حمراء وراءها نافذة تشرح أن التاريخ نفسه سيُمحى.
 */
export function SubscriptionActions({
  id,
  name,
  active,
}: {
  id: string
  name: string
  active: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [ending, setEnding] = useState(false)
  const [reason, setReason] = useState('')
  const [removing, setRemoving] = useState(false)
  const [impact, setImpact] = useState<Impact>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null)

  async function openDelete() {
    setRemoving(true)
    setLoading(true)
    setError('')
    try {
      setImpact(await subscriptionDeletionImpact(id))
    } catch {
      setError('تعذّر جلب تفاصيل الاشتراك.')
    } finally {
      setLoading(false)
    }
  }

  function resume() {
    startTransition(async () => {
      const res = await resumeSubscription(id)
      if (res.ok) {
        setToast({ msg: `أُعيد تفعيل اشتراك ${name}.`, tone: 'success' })
        router.refresh()
      } else setToast({ msg: res.error ?? '', tone: 'error' })
    })
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        {active ? (
          <Button
            size="sm" variant="ghost" disabled={pending}
            onClick={() => { setEnding(true); setReason('') }}
            title="أنهِ الاشتراك"
          >
            <Square className="h-3.5 w-3.5" />
            أنهِ
          </Button>
        ) : (
          <Button size="sm" variant="ghost" disabled={pending} onClick={resume} title="أعِد التفعيل">
            <Play className="h-3.5 w-3.5" />
            فعّل
          </Button>
        )}

        <Button
          size="sm" variant="ghost" disabled={pending}
          onClick={openDelete}
          aria-label={`احذف اشتراك ${name}`}
          title="احذف الاشتراك"
          className="text-ink-muted hover:bg-[#FEF3F2] hover:text-chip-danger-fg"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* الإنهاء — الطريق الموصى به */}
      <Dialog open={ending} onOpenChange={setEnding}>
        <DialogContent>
          <DialogTitle>إنهاء اشتراك {name}</DialogTitle>
          <DialogDescription>
            يخرج من الإيراد الشهري المتكرر فوراً، ويبقى في السجلّ فيبقى معه دخلُ الأشهر
            التي مضت. يمكنك إعادة تفعيله متى شئت.
          </DialogDescription>

          <div className="mt-4 space-y-1">
            <Label htmlFor="sub-reason">سبب التوقّف (اختياري)</Label>
            <Input
              id="sub-reason" value={reason} autoFocus
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: أغلق المحل، أو انتقل إلى منافس"
            />
            <p className="text-chip leading-relaxed text-ink-muted">
              تسجيل السبب يفيدك لاحقاً: تكرار السبب نفسه في اشتراكات عدّة يقول لك شيئاً
              عن الخدمة لا عن العميل.
            </p>
          </div>

          <div className="mt-5 flex justify-start gap-2">
            <Button
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const res = await endSubscription(id, reason)
                  setEnding(false)
                  if (res.ok) {
                    setToast({ msg: `أُنهي اشتراك ${name}.`, tone: 'success' })
                    router.refresh()
                  } else setToast({ msg: res.error ?? '', tone: 'error' })
                })
              }}
            >
              {pending ? 'جارٍ الحفظ…' : 'أنهِ الاشتراك'}
            </Button>
            <Button variant="ghost" onClick={() => setEnding(false)}>إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* الحذف — آخر الخيارات */}
      <Dialog open={removing} onOpenChange={setRemoving}>
        <DialogContent>
          <DialogTitle>حذف الاشتراك</DialogTitle>

          {loading ? (
            <DialogDescription>لحظة، نتحقّق مما سيُحذف…</DialogDescription>
          ) : impact ? (
            <>
              <DialogDescription>
                هل تريد حذف اشتراك <strong className="text-ink">{impact.name}</strong> نهائياً؟
                لا يمكن التراجع.
              </DialogDescription>

              <div className="mt-4 space-y-1 rounded-input bg-page p-4 text-body">
                <p className="font-semibold text-ink">{impact.productName}</p>
                <p className="text-ink-muted">
                  <span className="num font-semibold text-ink">
                    {formatMoney(impact.monthlyAmount, impact.currency)}
                  </span>{' '}
                  شهرياً
                  {impact.months > 0 && (
                    <>
                      {' · '}قائم منذ{' '}
                      <span className="num font-semibold text-ink">{impact.months}</span> شهراً
                    </>
                  )}
                </p>
              </div>

              {impact.status === 'active' && (
                <div className="mt-3 flex items-start gap-3 rounded-input bg-chip-warn-bg p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-chip-warn-fg" />
                  <p className="text-body font-semibold leading-relaxed text-chip-warn-fg">
                    هذا اشتراك فعّال. إن كان العميل توقّف فأنهِه بدل حذفه — الإنهاء يُخرجه من
                    الدخل الشهري ويُبقي ما دفعه في تقاريرك. الحذف يمحو الاثنين.
                  </p>
                </div>
              )}

              {error && (
                <p className="mt-3 text-body font-semibold text-chip-danger-fg">{error}</p>
              )}
            </>
          ) : (
            <DialogDescription>{error || 'لم نعثر على الاشتراك.'}</DialogDescription>
          )}

          <div className="mt-5 flex justify-start gap-2">
            <Button
              variant="danger"
              disabled={pending || loading || !impact}
              onClick={() => {
                startTransition(async () => {
                  const res = await deleteSubscription(id)
                  if (res.ok) {
                    setRemoving(false)
                    setToast({ msg: `حُذف اشتراك ${name}.`, tone: 'success' })
                    router.refresh()
                  } else setError(res.error ?? '')
                })
              }}
            >
              {pending ? 'جارٍ الحذف…' : 'نعم، احذفه'}
            </Button>
            <Button variant="ghost" onClick={() => setRemoving(false)}>إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>

      {toast && <Toast message={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
    </>
  )
}
