'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { contactDeletionImpact, deleteContact } from '@/lib/actions'
import { formatMoney } from '@/lib/utils'

type Impact = Awaited<ReturnType<typeof contactDeletionImpact>>

/**
 * حذف شخص.
 *
 * الشخص جذر كل ما بُني عليه، فحذفه يمحو صفقاته ومدفوعاتها وسجلّ التواصل
 * معه. نعرض ما سيُفقد بالرقم قبل السؤال، لا بعده، ونطلب كتابة الاسم حين
 * يكون على الملف مبلغ مسدَّد — عندها لا يكفي أن تكون الضغطة مقصودة، بل
 * يجب أن تكون واعية.
 */
export function DeleteContact({ contactId, fullName }: { contactId: string; fullName: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [impact, setImpact] = useState<Impact>(null)
  const [loading, setLoading] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [error, setError] = useState('')

  async function openDialog() {
    setOpen(true)
    setLoading(true)
    setError('')
    setConfirmName('')
    try {
      setImpact(await contactDeletionImpact(contactId))
    } catch {
      setError('تعذّر جلب تفاصيل الشخص.')
    } finally {
      setLoading(false)
    }
  }

  const hasMoney = (impact?.paidTotal ?? 0) > 0
  const nameMatches = confirmName.trim() === fullName.trim()
  const hasPersonalSub = (impact?.personalSubscriptions ?? 0) > 0
  const blocked = hasPersonalSub || (hasMoney && !nameMatches)

  return (
    <>
      <Button variant="ghost" className="w-full text-ink-muted hover:text-danger" onClick={openDialog}>
        <Trash2 className="h-4 w-4" />
        احذف جهة الاتصال
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>حذف جهة الاتصال</DialogTitle>

          {loading ? (
            <DialogDescription>لحظة، نتحقّق مما سيُحذف…</DialogDescription>
          ) : impact ? (
            <>
              <DialogDescription>
                هل تريد حذف <strong className="text-ink">{impact.fullName}</strong> نهائياً؟
                لا يمكن التراجع عن هذا الإجراء.
              </DialogDescription>

              <div className="mt-4 space-y-2 rounded-input bg-page p-4 text-sm">
                <p className="font-semibold text-ink">سيُحذف معه:</p>
                <ul className="space-y-1 text-ink-muted">
                  <li>
                    <span className="num font-semibold text-ink">{impact.deals}</span> صفقة،
                    و<span className="num font-semibold text-ink"> {impact.payments}</span> سجل دفع.
                  </li>
                  <li>
                    <span className="num font-semibold text-ink">{impact.activities}</span> نشاطاً
                    مسجَّلاً، و<span className="num font-semibold text-ink"> {impact.tasks}</span> مهمة.
                  </li>
                  {impact.subscriptions > impact.personalSubscriptions && (
                    <li>
                      <span className="num font-semibold text-ink">
                        {impact.subscriptions - impact.personalSubscriptions}
                      </span>{' '}
                      اشتراكاً سيبقى قائماً باسم جهته، لكنه سيصبح بلا شخصٍ مسؤول.
                    </li>
                  )}
                </ul>
              </div>

              {/* مانع حقيقي، لا تحذير: قاعدة البيانات ترفض اشتراكاً بلا صاحب */}
              {hasPersonalSub && (
                <div className="mt-3 flex items-start gap-3 rounded-input bg-warn/12 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
                  <p className="text-sm font-semibold leading-relaxed text-ink">
                    لا يمكن حذفه الآن: عليه{' '}
                    <span className="num">{impact.personalSubscriptions}</span> اشتراكاً باسمه
                    لا جهة له، وكل اشتراك يلزمه صاحب. انقل الاشتراك إلى جهة من شاشة الاشتراكات،
                    أو أنهِه، ثم عُد إلى هنا.
                  </p>
                </div>
              )}

              {hasMoney && (
                <div className="mt-3 space-y-3 rounded-input bg-danger/8 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                    <p className="text-sm font-semibold leading-relaxed text-danger">
                      على هذا الملف مبلغ مسدَّد قدره{' '}
                      <span className="num">{formatMoney(impact.paidTotal)}</span>. حذفه يمحو
                      سجلاً مالياً لن تجده في أي تقرير بعد اليوم.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="dc-confirm" className="text-xs font-semibold text-ink">
                      اكتب اسم الشخص للتأكيد: <span className="font-bold">{fullName}</span>
                    </label>
                    <input
                      id="dc-confirm"
                      value={confirmName}
                      autoComplete="off"
                      onChange={(e) => setConfirmName(e.target.value)}
                      className="mt-1 h-10 w-full rounded-input border border-line bg-card px-3 text-sm text-ink focus:border-danger focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {error && <p className="mt-3 text-sm font-semibold text-danger">{error}</p>}
            </>
          ) : (
            <DialogDescription>{error || 'لم نعثر على هذا الشخص.'}</DialogDescription>
          )}

          <div className="mt-5 flex justify-start gap-2">
            <Button
              variant="danger"
              disabled={pending || loading || !impact || blocked}
              onClick={() => {
                startTransition(async () => {
                  const res = await deleteContact(contactId)
                  if (res.ok) {
                    setOpen(false)
                    router.push('/contacts')
                    router.refresh()
                  } else {
                    setError(res.error ?? '')
                  }
                })
              }}
            >
              {pending ? 'جارٍ الحذف…' : 'نعم، احذفه'}
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
