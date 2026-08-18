'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { dealDeletionImpact, deleteDeal } from '@/lib/actions'
import { formatMoney } from '@/lib/utils'

type Impact = Awaited<ReturnType<typeof dealDeletionImpact>>

/**
 * حذف صفقة.
 *
 * الحذف يجرّ معه المدفوعات والمهام، فنسأل الخادم أولاً عمّا سيُفقد ونعرضه
 * بالاسم والمبلغ قبل التأكيد. صفقة عليها مبلغ مسدَّد تحصل على تحذير أشدّ،
 * لأن حذفها يمحو سجلاً مالياً لا يمكن استرجاعه.
 */
export function DeleteDeal({ dealId }: { dealId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [impact, setImpact] = useState<Impact>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function openDialog() {
    setOpen(true)
    setLoading(true)
    setError('')
    try {
      setImpact(await dealDeletionImpact(dealId))
    } catch {
      setError('تعذّر جلب تفاصيل الصفقة.')
    } finally {
      setLoading(false)
    }
  }

  const hasMoney = (impact?.paidTotal ?? 0) > 0

  return (
    <>
      <button
        type="button"
        aria-label="احذف الصفقة"
        title="احذف الصفقة"
        // إيقاف انتشار الحدث ضروري: البطاقة نفسها قابلة للسحب
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          openDialog()
        }}
        className="shrink-0 rounded-input p-1.5 text-faint text-ink-muted/60 transition-colors duration-150 hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>حذف الصفقة</DialogTitle>

          {loading ? (
            <DialogDescription>لحظة، نتحقّق مما سيُحذف…</DialogDescription>
          ) : impact ? (
            <>
              <DialogDescription>
                هل تريد حذف صفقة <strong className="text-ink">{impact.contactName}</strong>؟
                لا يمكن التراجع عن هذا الإجراء.
              </DialogDescription>

              <div className="mt-4 space-y-2 rounded-input bg-page p-4 text-sm">
                <p className="font-semibold text-ink">{impact.title}</p>
                <ul className="space-y-1 text-ink-muted">
                  <li>
                    سيُحذف معها <span className="num font-semibold text-ink">{impact.payments}</span> سجل دفع
                    و<span className="num font-semibold text-ink"> {impact.tasks}</span> مهمة.
                  </li>
                  <li>الأنشطة المسجَّلة تبقى في ملف الشخص.</li>
                </ul>
              </div>

              {hasMoney && (
                <div className="mt-3 flex items-start gap-3 rounded-input bg-danger/8 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                  <p className="text-sm font-semibold leading-relaxed text-danger">
                    على هذه الصفقة مبلغ مسدَّد قدره{' '}
                    <span className="num">{formatMoney(impact.paidTotal)}</span>. حذفها يمحو هذا
                    السجل المالي نهائياً — إن كانت خاسرة فانقلها إلى «خسرناه» بدل حذفها.
                  </p>
                </div>
              )}
            </>
          ) : (
            <DialogDescription>{error || 'لم نعثر على الصفقة.'}</DialogDescription>
          )}

          <div className="mt-5 flex justify-start gap-2">
            <Button
              variant="danger"
              disabled={pending || loading || !impact}
              onClick={() => {
                startTransition(async () => {
                  const res = await deleteDeal(dealId)
                  if (res.ok) {
                    setOpen(false)
                    router.refresh()
                  } else {
                    setError(res.error ?? '')
                  }
                })
              }}
            >
              {pending ? 'جارٍ الحذف…' : 'نعم، احذفها'}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
