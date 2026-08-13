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
      className={cn('inline-flex items-center rounded-pill px-2 py-1 text-xs font-semibold', className)}
      style={{ backgroundColor: `${color}1A`, color }}
    >
      {children}
    </span>
  )
}
