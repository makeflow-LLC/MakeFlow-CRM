'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { Chip } from '@/components/ui/pill'
import { Toast } from '@/components/ui/toast'
import { completeTask } from '@/lib/actions'
import { cn, timeAgo } from '@/lib/utils'
import type { QueueTask } from '@/lib/types'

/**
 * صفّ مهمة في شاشة «اليوم».
 *
 * الإنجاز مربّع تأشير لا زر: القائمة تُقرأ كقائمة شطب، وهو ما يفعله الناس
 * بها فعلاً. وقائمةٌ لا تُشطب منها المهام تمتلئ خلال أسبوع فيتوقّف صاحبها
 * عن النظر إليها، وعندها تصير الشاشة زينة.
 */
export function TaskRow({ task, overdue = false }: { task: QueueTask; overdue?: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null)

  function complete() {
    if (pending || done) return
    startTransition(async () => {
      const res = await completeTask(task.id)
      if (res.ok) {
        setDone(true)
        setToast({ msg: 'أُنجزت المهمة.', tone: 'success' })
        router.refresh()
      } else setToast({ msg: res.error ?? '', tone: 'error' })
    })
  }

  return (
    <>
      <div
        className={cn(
          'row flex flex-wrap items-center gap-3 px-4.5 py-3',
          done && 'opacity-45',
        )}
      >
        <button
          type="button"
          onClick={complete}
          disabled={pending || done}
          aria-label={done ? 'أُنجزت' : `أنجز: ${task.title}`}
          className={cn(
            'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border transition-colors duration-150',
            done
              ? 'border-accent bg-accent text-white'
              : 'border-line bg-card text-transparent hover:border-accent hover:bg-accent-soft hover:text-accent',
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </button>

        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-body-lg font-semibold text-ink', done && 'line-through')}>
            {task.title}
          </p>
          <p className="truncate text-faint text-ink-muted">
            {task.contact ? task.contact.full_name : 'غير مرتبطة بشخص'}
          </p>
        </div>

        {overdue ? (
          <Chip tone="danger" className="shrink-0 whitespace-nowrap">{timeAgo(task.due_at)}</Chip>
        ) : (
          <span className="shrink-0 whitespace-nowrap text-faint text-ink-muted">
            {timeAgo(task.due_at)}
          </span>
        )}

        {task.contact && (
          <Link
            href={`/contacts/${task.contact.id}`}
            className="shrink-0 rounded-input border border-line px-2.5 py-1 text-chip font-semibold text-ink-muted transition-colors duration-150 hover:bg-[#F4F5F8] hover:text-ink"
          >
            افتح الملف
          </Link>
        )}
      </div>

      {toast && <Toast message={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
    </>
  )
}
