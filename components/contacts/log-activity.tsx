'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { createActivity } from '@/lib/actions'
import { microcopy } from '@/lib/hints'
import { cn } from '@/lib/utils'

const TYPES = [
  { value: 'whatsapp', label: 'واتساب' },
  { value: 'call', label: 'مكالمة' },
  { value: 'meeting', label: 'اجتماع' },
  { value: 'note', label: 'ملاحظة' },
] as const

type ActivityKind = (typeof TYPES)[number]['value']

/** صندوق تسجيل النشاط أسفل الخط الزمني في ملف العميل. */
export function LogActivity({ contactId }: { contactId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [summary, setSummary] = useState('')
  const [type, setType] = useState<ActivityKind>('call')
  const [error, setError] = useState('')

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        setError('')
        if (!summary.trim()) {
          setError('اكتب ما جرى باختصار.')
          return
        }
        startTransition(async () => {
          const res = await createActivity({ contact_id: contactId, summary, type })
          if (res.ok) {
            setSummary('')
            router.refresh()
          } else {
            setError(res.error ?? '')
          }
        })
      }}
    >
      {/* نوع النشاط أولاً: اختيار واحد يغني عن قائمة منسدلة */}
      <div className="flex flex-wrap gap-1">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={cn(
              'rounded-pill px-3 py-1 text-xs font-semibold transition-colors duration-150',
              type === t.value
                ? 'bg-accent text-white'
                : 'bg-page text-ink-muted hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Textarea
        rows={2}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="ما الذي جرى مع هذا العميل؟ دوّنه هنا حتى لا يُنسى…"
      />

      {error && <p className="text-xs font-medium text-danger">{error}</p>}

      <Button size="sm" type="submit" disabled={pending}>
        {pending ? 'جارٍ الحفظ…' : microcopy.buttons.addActivity}
      </Button>
    </form>
  )
}
