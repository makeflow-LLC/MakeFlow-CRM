'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { deleteOrganization, organizationDeletionImpact } from '@/lib/actions'
import { formatMoney } from '@/lib/utils'

type Impact = Awaited<ReturnType<typeof organizationDeletionImpact>>

/**
 * حذف جهة.
 *
 * أخفّ من حذف شخص: لا أحد يُمحى ولا صفقة، بل يُفكّ الارتباط فقط. لكن ذلك
 * نفسه يحتاج تصريحاً — «سيبقى الأشخاص بلا جهة» معلومة يريد المستخدم أن
 * يعرفها قبل الضغط لا بعده.
 */
export function DeleteOrganization({ id, name }: { id: string; name: string }) {
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
      setImpact(await organizationDeletionImpact(id))
    } catch {
      setError('تعذّر جلب تفاصيل الجهة.')
    } finally {
      setLoading(false)
    }
  }

  const blocked = (impact?.orphanSubscriptions ?? 0) > 0

  return (
    <>
      <Button variant="ghost" className="w-full text-ink-muted hover:bg-[#FEF3F2] hover:text-chip-danger-fg" onClick={openDialog}>
        <Trash2 className="h-4 w-4" />
        احذف الجهة
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>حذف الجهة</DialogTitle>

          {loading ? (
            <DialogDescription>لحظة، نتحقّق مما سيتأثّر…</DialogDescription>
          ) : impact ? (
            <>
              <DialogDescription>
                هل تريد حذف <strong className="text-ink">{impact.name}</strong>؟
                لا يمكن التراجع عن هذا الإجراء.
              </DialogDescription>

              <div className="mt-4 space-y-2 rounded-input bg-page p-4 text-body">
                <p className="font-semibold text-ink">لن يُحذف أحد ولا صفقة:</p>
                <ul className="space-y-1 text-ink-muted">
                  <li>
                    <span className="num font-semibold text-ink">{impact.contacts}</span> شخصاً
                    سيبقون في جهات الاتصال، بلا جهة.
                  </li>
                  <li>
                    <span className="num font-semibold text-ink">{impact.deals}</span> صفقة
                    ستبقى كما هي، بلا جهة.
                  </li>
                  {impact.subscriptions > impact.orphanSubscriptions && (
                    <li>
                      <span className="num font-semibold text-ink">
                        {impact.subscriptions - impact.orphanSubscriptions}
                      </span>{' '}
                      اشتراكاً سيبقى باسم الشخص المرتبط به.
                    </li>
                  )}
                </ul>
              </div>

              {blocked ? (
                <div className="mt-3 flex items-start gap-3 rounded-input bg-chip-warn-bg p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-chip-warn-fg" />
                  <p className="text-body font-semibold leading-relaxed text-ink">
                    لا يمكن حذفها الآن: عليها{' '}
                    <span className="num">{impact.orphanSubscriptions}</span> اشتراكاً باسمها
                    لا شخص له، وكل اشتراك يلزمه صاحب. أنهِ الاشتراك أو احذفه من شاشة
                    الاشتراكات، ثم عُد إلى هنا.
                  </p>
                </div>
              ) : impact.mrr > 0 ? (
                <div className="mt-3 flex items-start gap-3 rounded-input bg-chip-danger-bg p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-chip-danger-fg" />
                  <p className="text-body font-semibold leading-relaxed text-chip-danger-fg">
                    هذه الجهة تدرّ{' '}
                    <span className="num">{formatMoney(impact.mrr)}</span> شهرياً. حذفها يفكّ
                    اشتراكاتها عنها، فتفقد الربط بين الدخل وصاحبه.
                  </p>
                </div>
              ) : null}

              {error && (
                <p className="mt-3 text-body font-semibold text-chip-danger-fg">{error}</p>
              )}
            </>
          ) : (
            <DialogDescription>{error || 'لم نعثر على هذه الجهة.'}</DialogDescription>
          )}

          <div className="mt-5 flex justify-start gap-2">
            <Button
              variant="danger"
              disabled={pending || loading || !impact || blocked}
              onClick={() => {
                startTransition(async () => {
                  const res = await deleteOrganization(id)
                  if (res.ok) {
                    setOpen(false)
                    router.push('/organizations')
                    router.refresh()
                  } else {
                    setError(res.error ?? '')
                  }
                })
              }}
            >
              {pending ? 'جارٍ الحذف…' : 'نعم، احذفها'}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
