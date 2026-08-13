import { cn, initials } from '@/lib/utils'

export function Avatar({
  name,
  color = '#5B4CE0',
  size = 'md',
  className,
}: {
  name: string
  color?: string
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <span
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-pill font-bold text-white',
        size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs',
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initials(name)}
    </span>
  )
}
