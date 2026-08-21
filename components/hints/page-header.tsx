import { ChevronLeft } from 'lucide-react'
import type { TermKey } from '@/lib/hints'
import { HintTooltip } from './hint-tooltip'
import { Chip, type ChipTone } from '@/components/ui/pill'

/**
 * الطبقة 1 من نظام التلميحات.
 *
 * لكل شاشة سطر تحت العنوان يشرح بلغة بسيطة وظيفتها وما المطلوب من المستخدم
 * فيها. ظاهر دائماً ولا يُغلق، لأنه ليس إشعاراً بل جزء من الشاشة.
 *
 * وفوقه مسار تنقّل صغير يقول أين أنت — يفيد في الشاشات الفرعية (ملف شخص،
 * ملف جهة) حيث لا يكفي العنوان وحده لمعرفة الطريق إلى هنا.
 */
export function PageHeader({
  title,
  hint,
  term,
  action,
  crumb = 'المنصة',
}: {
  title: string
  hint: string
  term?: TermKey
  action?: React.ReactNode
  /** القسم الذي تنتمي إليه الشاشة، يظهر قبل اسمها في مسار التنقّل */
  crumb?: string
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-5.5">
      <div className="min-w-0 max-w-[620px]">
        <div className="flex items-center gap-2 pb-1.5 text-faint text-ink-muted">
          <span className="truncate">{crumb}</span>
          <ChevronLeft className="h-3 w-3 shrink-0" strokeWidth={2} />
          <span className="truncate font-medium text-accent">{title}</span>
        </div>

        <h1 className="flex items-center gap-2 text-title font-bold text-ink">
          {title}
          {term && <HintTooltip term={term} />}
        </h1>
        <p className="mt-1 text-body-lg leading-relaxed text-ink-muted">{hint}</p>
      </div>

      {action && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{action}</div>}
    </header>
  )
}

/** ترويسة قسم جوّا الصفحة */
export function SectionHeader({
  title,
  term,
  count,
  tone = 'accent',
  action,
}: {
  title: string
  term?: TermKey
  count?: number
  tone?: ChipTone
  action?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <h2 className="flex items-center gap-2 text-section font-semibold text-ink">
        {title}
        {term && <HintTooltip term={term} />}
        {count !== undefined && count > 0 && (
          <Chip tone={tone} className="num">{count}</Chip>
        )}
      </h2>
      {action}
    </div>
  )
}
