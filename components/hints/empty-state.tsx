import { cn } from '@/lib/utils'

/**
 * الطبقة 3 من نظام التلميحات.
 *
 * يُمنع أن تظهر شاشة فارغة تكتفي بعبارة «لا توجد بيانات». كل حالة فارغة
 * تتكوّن من أيقونة، وسطر يشرح ما الذي يظهر هنا عادةً، وزر ينفّذ الإجراء.
 *
 * وفي هذا الثيم صارت الحالة الفارغة بطاقةً كاملة الحضور (حشوة 52px)، لأنها
 * غالباً كل ما في الشاشة — فإن بدت هامشيةً بدت الشاشة معطوبة.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
  tone = 'empty',
  className,
}: {
  icon?: React.ReactNode
  title: string
  body: string
  action?: React.ReactNode
  /** `done` = خلّصت شغلك، ليس نقص بيانات */
  tone?: 'empty' | 'done'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-line bg-card px-7.5 py-[52px] text-center',
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'mb-4 flex h-14 w-14 items-center justify-center rounded-card',
            tone === 'done'
              ? 'bg-chip-success-bg text-chip-success-fg'
              : 'bg-page text-ink-muted',
          )}
        >
          {icon}
        </div>
      )}
      <p className="mb-2 text-xl font-bold text-ink">{title}</p>
      <p className="mb-5 max-w-md text-body-lg leading-relaxed text-ink-muted">{body}</p>
      {action && <div className="flex flex-wrap items-center justify-center gap-2.5">{action}</div>}
    </div>
  )
}
