import { cn } from '@/lib/utils'

/** حبة ملوّنة بخلفية صلبة ونص أبيض عريض — أسلوب Monday */
export function Pill({
  color,
  children,
  className,
}: {
  color: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn('pill', className)} style={{ backgroundColor: color }}>
      {children}
    </span>
  )
}

/**
 * شريحة حالة من زوج (خلفية فاتحة / نص داكن) — لا لون صلب.
 * هذه هي الوحدة البصرية الأكثر تكراراً في الثيم، فتُعرَّف مرة واحدة هنا.
 */
export const CHIP_TONES = {
  success: 'bg-chip-success-bg text-chip-success-fg',
  warn: 'bg-chip-warn-bg text-chip-warn-fg',
  danger: 'bg-chip-danger-bg text-chip-danger-fg',
  neutral: 'bg-chip-neutral-bg text-chip-neutral-fg',
  accent: 'bg-chip-accent-bg text-chip-accent-fg',
  blue: 'bg-chip-blue-bg text-chip-blue-fg',
  pink: 'bg-chip-pink-bg text-chip-pink-fg',
} as const

export type ChipTone = keyof typeof CHIP_TONES

export function Chip({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: ChipTone
  children: React.ReactNode
  className?: string
}) {
  return <span className={cn('chip', CHIP_TONES[tone], className)}>{children}</span>
}

/** نسخة خفيفة: خلفية شفافة واللون على النص — للمنتجات جوّا البطاقات */
export function SoftPill({
  color,
  children,
  className,
}: {
  color: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn('inline-flex items-center rounded-pill px-2 py-0.5 text-chip font-semibold', className)}
      style={{ backgroundColor: `${color}1A`, color }}
    >
      {children}
    </span>
  )
}
