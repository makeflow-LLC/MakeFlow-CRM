'use client'

import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Info } from 'lucide-react'
import { termHints, type TermKey } from '@/lib/hints'
import { cn } from '@/lib/utils'

/**
 * الطبقة 2 من نظام التلميحات.
 *
 * أيقونة ⓘ جنب أي مصطلح مش واضح. بتفتح بالحَوَم على الكمبيوتر وبالضغط على
 * الموبايل — لأن مستخدمينا أول مرة بيستعملوا CRM، ولازم يلاقوا الشرح بأي
 * طريقة جرّبوها.
 */
export function HintTooltip({ term, className }: { term: TermKey; className?: string }) {
  const [open, setOpen] = useState(false)
  const hint = termHints[term]
  if (!hint) return null

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`شو يعني ${hint.title}؟`}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={(e) => {
            e.preventDefault()
            setOpen((v) => !v)
          }}
          className={cn(
            'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-pill text-ink-muted transition-colors duration-150 hover:text-accent',
            className,
          )}
        >
          <Info className="h-4 w-4" strokeWidth={2} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-50 w-[280px] animate-fade-in rounded-card border border-line bg-card p-4 shadow-pop"
          dir="rtl"
        >
          <p className="mb-2 text-sm font-bold text-ink">{hint.title}</p>
          <p className="mb-3 text-sm leading-relaxed text-ink">{hint.definition}</p>
          <p className="rounded-input bg-page p-3 text-xs leading-relaxed text-ink-muted">
            <span className="font-semibold text-ink">مثال: </span>
            {hint.example}
          </p>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/** عنوان صغير + أيقونة شرح — بنستعملها بترويسات الجداول والأقسام */
export function LabelWithHint({
  children,
  term,
  className,
}: {
  children: React.ReactNode
  term?: TermKey
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {children}
      {term && <HintTooltip term={term} />}
    </span>
  )
}
