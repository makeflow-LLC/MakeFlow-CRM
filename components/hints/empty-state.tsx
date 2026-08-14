import { cn } from '@/lib/utils'

/**
 * الطبقة 3 من نظام التلميحات.
 *
 * يُمنع أن تظهر شاشة فارغة تكتفي بعبارة «لا توجد بيانات». كل حالة فارغة
 * تتكوّن من أيقونة، وسطر يشرح ما الذي يظهر هنا عادةً، وزر ينفّذ الإجراء.
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
        'flex flex-col items-center justify-center rounded-card px-6 py-12 text-center',
        tone === 'done' ? 'bg-[#F0FBF6]' : 'bg-page',
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'mb-4 flex h-14 w-14 items-center justify-center rounded-card',
            tone === 'done' ? 'bg-success/15 text-success' : 'bg-card text-ink-muted shadow-card',
          )}
        >
          {icon}
        </div>
      )}
      <p className="mb-1 text-base font-bold text-ink">{title}</p>
      <p className="mb-4 max-w-md text-sm leading-relaxed text-ink-muted">{body}</p>
      {action}
    </div>
  )
}
