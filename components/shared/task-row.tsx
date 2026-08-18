'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toast } from '@/components/ui/toast'
import { completeTask } from '@/lib/actions'
import { timeAgo } from '@/lib/utils'
import type { QueueTask } from '@/lib/types'

/**
 * صفّ مهمة في شاشة «اليوم».
 *
 * الإنجاز هنا لا في شاشة أخرى: قائمةٌ لا تُشطب منها المهام تمتلئ خلال
 * أسبوع فيتوقّف صاحبها عن النظر إليها، وعندها تصير الشاشة زينة.
 */
export function TaskRow({ task, overdue = false }: { task: QueueTask; overdue?: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null)

  return (
    <>
      <div
        className={
          // الحد على بداية السطر — بالعربي هذا اليمين، وينعكس لحاله بالإنجليزي
          overdue
            ? 'row flex flex-wrap items-center gap-4 border-s-4 border-s-danger bg-danger/[0.03] px-6 py-3'
            : 'row flex flex-wrap items-center gap-4 px-6 py-3'
        }
        style={done ? { opacity: 0.45 } : undefined}
      >
        <span
          className={
            overdue
              ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-input bg-danger/12 text-danger'
              : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-input bg-accent-soft text-accent'
          }
        >
          {overdue ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-bold text-ink ${done ? 'line-through' : ''}`}>
            {task.title}
          </p>
          <p className="truncate text-xs text-ink-muted">
            {task.contact ? task.contact.full_name : 'غير مرتبطة بشخص'}
            {' · '}
            <span className={overdue ? 'font-semibold text-danger' : ''}>{timeAgo(task.due_at)}</span>
          </p>
        </div>

        <Button
          size="sm"
          variant="success"
          disabled={pending || done}
          onClick={() => {
            startTransition(async () => {
              const res = await completeTask(task.id)
              if (res.ok) {
                setDone(true)
                setToast({ msg: 'أُنجزت المهمة.', tone: 'success' })
                router.refresh()
              } else setToast({ msg: res.error ?? '', tone: 'error' })
            })
          }}
        >
          <Check className="h-4 w-4" />
          {done ? 'أُنجزت' : 'أنجزتها'}
        </Button>

        {task.contact && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/contacts/${task.contact.id}`}>افتح الملف</Link>
          </Button>
        )}
      </div>

      {toast && <Toast message={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
    </>
  )
}
