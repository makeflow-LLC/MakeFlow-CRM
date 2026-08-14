import type { TermKey } from '@/lib/hints'
import { HintTooltip } from './hint-tooltip'

/**
 * الطبقة 1 من نظام التلميحات.
 *
 * لكل شاشة سطر تحت العنوان يشرح بلغة بسيطة وظيفتها وما المطلوب من المستخدم
 * فيها. ظاهر دائماً ولا يُغلق، لأنه ليس إشعاراً بل جزء من الشاشة.
 */
export function PageHeader({
  title,
  hint,
  term,
  action,
}: {
  title: string
  hint: string
  term?: TermKey
  action?: React.ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          {title}
          {term && <HintTooltip term={term} />}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{hint}</p>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  )
}

/** ترويسة قسم جوّا الصفحة */
export function SectionHeader({
  title,
  term,
  count,
  tone = 'default',
  action,
}: {
  title: string
  term?: TermKey
  count?: number
  tone?: 'default' | 'danger'
  action?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-bold text-ink">
        {title}
        {term && <HintTooltip term={term} />}
        {count !== undefined && count > 0 && (
          <span
            className={
              tone === 'danger'
                ? 'rounded-pill bg-danger px-2 py-0.5 text-xs font-bold text-white'
                : 'rounded-pill bg-page px-2 py-0.5 text-xs font-bold text-ink-muted'
            }
          >
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  )
}
