'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BellPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Toast } from '@/components/ui/toast'
import { createTask } from '@/lib/actions'
import { cn } from '@/lib/utils'
import type { Contact } from '@/lib/types'

const selectClass =
  'h-[38px] w-full rounded-input border border-line bg-card px-3 text-body text-ink transition-colors duration-150 hover:border-[#D3D8E3] focus:border-accent focus:outline-none'

/** يحوّل تاريخاً إلى صيغة datetime-local بالتوقيت المحلي */
function toLocalInput(d: Date): string {
  const copy = new Date(d)
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset())
  return copy.toISOString().slice(0, 16)
}

/**
 * المواعيد الجاهزة تغطّي ما يقوله الناس فعلاً: «بعد ساعة»، «بكرة الصبح»،
 * «بعد ثلاثة أيام». كتابة تاريخ كامل لتذكير بعد الغد عملٌ زائد يجعل
 * المستخدم يتركه ولا يسجّله أصلاً.
 */
const PRESETS: { label: string; at: () => Date }[] = [
  {
    label: 'بعد ساعة',
    at: () => new Date(Date.now() + 3_600_000),
  },
  {
    label: 'غداً صباحاً',
    at: () => {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      d.setHours(9, 0, 0, 0)
      return d
    },
  },
  {
    label: 'بعد ثلاثة أيام',
    at: () => {
      const d = new Date()
      d.setDate(d.getDate() + 3)
      d.setHours(9, 0, 0, 0)
      return d
    },
  },
  {
    label: 'الأسبوع القادم',
    at: () => {
      const d = new Date()
      d.setDate(d.getDate() + 7)
      d.setHours(9, 0, 0, 0)
      return d
    },
  },
]

/**
 * تذكير.
 *
 * التذكير مهمة لها موعد، ويظهر في شاشة «اليوم» حين يحين وقته، وفي
 * «مهام متأخرة» إن فات. هذا هو الفرق بينه وبين النشاط: النشاط ما جرى،
 * والتذكير ما ستفعله.
 */
export function AddReminder({
  contacts,
  presetContactId,
  presetTitle,
  label = 'أضف تذكيراً',
  variant = 'outline',
  size = 'md',
}: {
  contacts: Contact[]
  presetContactId?: string
  presetTitle?: string
  label?: string
  variant?: 'primary' | 'outline' | 'soft' | 'ghost'
  size?: 'sm' | 'md'
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <BellPlus className="h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>تذكير</DialogTitle>
          <DialogDescription>
            سيظهر في شاشة «اليوم» عند حلول موعده، وينتقل إلى «مهام متأخرة» إن مرّ الموعد
            دون إنجازه.
          </DialogDescription>
          <div className="mt-4">
            <ReminderForm
              contacts={contacts}
              presetContactId={presetContactId}
              presetTitle={presetTitle}
              onDone={() => setOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** النموذج وحده — تستعمله النافذة أعلاه وتبويب «تذكير» في الإضافة السريعة. */
export function ReminderForm({
  contacts,
  presetContactId,
  presetTitle,
  onDone,
}: {
  contacts: Contact[]
  presetContactId?: string
  presetTitle?: string
  onDone: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState(presetTitle ?? '')
  const [contactId, setContactId] = useState(presetContactId ?? '')
  const [preset, setPreset] = useState(1) // غداً صباحاً
  const [custom, setCustom] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const dueAt = custom ? new Date(custom) : PRESETS[preset].at()

  return (
    <>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              setError('')
              if (!title.trim()) return setError('اكتب ما الذي تريد أن تُذكَّر به.')
              if (Number.isNaN(dueAt.getTime())) return setError('حدّد موعداً صحيحاً.')

              startTransition(async () => {
                const res = await createTask({
                  title,
                  due_at: dueAt.toISOString(),
                  contact_id: contactId || undefined,
                })

                if (res.ok) {
                  setTitle(''); setCustom('')
                  onDone()
                  setToast('أُضيف التذكير، وسيظهر في شاشة «اليوم» في موعده.')
                  router.refresh()
                } else setError(res.error ?? '')
              })
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="ar-title">ما الذي تريد أن تفعله؟</Label>
              <Input
                id="ar-title" value={title} autoFocus
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: اتصل بجهاد وتابع تحويل المبلغ"
              />
            </div>

            <div className="space-y-2">
              <Label>متى؟</Label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p, i) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => { setPreset(i); setCustom('') }}
                    className={cn(
                      'rounded-pill px-3 py-1.5 text-xs font-semibold transition-colors duration-150',
                      !custom && preset === i
                        ? 'bg-accent text-white'
                        : 'bg-page text-ink-muted hover:text-ink',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <Input
                type="datetime-local"
                aria-label="موعد محدّد"
                value={custom || toLocalInput(PRESETS[preset].at())}
                dir="ltr"
                className="num text-left"
                onChange={(e) => setCustom(e.target.value)}
              />
            </div>

            {contacts.length > 0 && !presetContactId && (
              <div className="space-y-1">
                <Label htmlFor="ar-contact">بخصوص من؟ (اختياري)</Label>
                <select
                  id="ar-contact" value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className={selectClass}
                >
                  <option value="">بلا ربط بشخص</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
                <p className="text-xs text-ink-muted">
                  الربط بشخص يضع زرّاً في التذكير يفتح ملفه مباشرة.
                </p>
              </div>
            )}

            <FieldError>{error}</FieldError>

            <div className="flex justify-start gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? 'جارٍ الحفظ…' : 'أضف التذكير'}
              </Button>
              <Button type="button" variant="ghost" onClick={onDone}>إلغاء</Button>
            </div>
          </form>

      {toast && <Toast message={toast} tone="success" onClose={() => setToast('')} />}
    </>
  )
}
