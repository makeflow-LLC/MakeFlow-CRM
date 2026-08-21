import Link from 'next/link'
import { AlertTriangle, Bot, Calendar, FileText, Mail, MessageCircle, Phone, Sparkles, Users } from 'lucide-react'
import { Chip, Pill, SoftPill, type ChipTone } from '@/components/ui/pill'
import { Avatar } from '@/components/ui/avatar'
import { HintTooltip } from '@/components/hints/hint-tooltip'
import type { ActivityType, Product, Stage, User } from '@/lib/types'
import { cn, formatMoney, formatNumber, hoursLabel } from '@/lib/utils'
import type { TermKey } from '@/lib/hints'

export function StagePill({ stage }: { stage: Stage }) {
  return <Pill color={stage.color}>{stage.name}</Pill>
}

export function ProductPill({ product }: { product: Product }) {
  return <SoftPill color={product.color}>{product.name}</SoftPill>
}

export function OwnerAvatar({ owner }: { owner: User | null }) {
  if (!owner) {
    return (
      <span
        title="لا يوجد مسؤول — أسنِدها إلى أحد أعضاء الفريق"
        className="inline-flex h-8 w-8 items-center justify-center rounded-pill border border-dashed border-line text-ink-faint"
      >
        <Users className="h-4 w-4" />
      </span>
    )
  }
  return <Avatar name={owner.full_name} color={owner.avatar_color} />
}

/** شارة «عالق منذ» — برتقالية، تظهر بس بعد 48 ساعة */
export function StuckBadge({ hours }: { hours: number }) {
  return (
    <Chip tone="warn" className="whitespace-nowrap">
      <AlertTriangle className="h-3 w-3 shrink-0" />
      متوقفة منذ {hoursLabel(hours)}
    </Chip>
  )
}

const ACTIVITY_ICONS: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  whatsapp: MessageCircle,
  call: Phone,
  meeting: Calendar,
  note: FileText,
  email: Mail,
  system: Sparkles,
}

export function ActivityIcon({ type, className }: { type: ActivityType; className?: string }) {
  const Icon = ACTIVITY_ICONS[type] ?? FileText
  return <Icon className={cn('h-4 w-4', className)} />
}

/** شارة «بوت» — لتمييز ما كتبه النظام عمّا كتبه إنسان */
export function BotBadge() {
  return (
    <Chip tone="blue">
      <Bot className="h-3 w-3 shrink-0" />
      بوت
    </Chip>
  )
}

const STAT_TONES = {
  default: { text: 'text-ink', icon: 'bg-chip-neutral-bg text-chip-neutral-fg' },
  warn: { text: 'text-chip-warn-fg', icon: 'bg-chip-warn-bg text-chip-warn-fg' },
  accent: { text: 'text-accent', icon: 'bg-chip-accent-bg text-chip-accent-fg' },
  success: { text: 'text-chip-success-fg', icon: 'bg-chip-success-bg text-chip-success-fg' },
  danger: { text: 'text-chip-danger-fg', icon: 'bg-chip-danger-bg text-chip-danger-fg' },
} as const

export type StatTone = keyof typeof STAT_TONES

/**
 * بطاقة رقم بالأعلى.
 *
 * صف الرقم لازمه flex-wrap: المبلغ ورمز العملة وشريحة التغيّر ثلاثة عناصر
 * على سطر واحد، وبعرض 240px تنكسر — والانكسار أهون من فيضان البطاقة.
 */
export function StatCard({
  label, value, term, tone = 'default', suffix, sub, icon, delta, deltaTone = 'success',
}: {
  label: string
  value: number
  term?: TermKey
  tone?: StatTone
  suffix?: string
  /** سطر صغير تحت الرقم — العدد خلف المبلغ، أو ما يفسّره */
  sub?: React.ReactNode
  icon?: React.ReactNode
  /** شريحة صغيرة بجانب الرقم: نسبة تغيّر، أو عدد يفسّره */
  delta?: string
  deltaTone?: ChipTone
}) {
  const t = STAT_TONES[tone]

  return (
    <div className="surface p-4.5">
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className={cn('flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-chip', t.icon)}>
            {icon}
          </span>
        )}
        <span className="flex min-w-0 items-center gap-1 text-[13px] font-medium text-ink-muted">
          <span className="truncate">{label}</span>
          {term && <HintTooltip term={term} />}
        </span>
      </div>

      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1.5 pb-2 pt-3">
        <span className={cn('num text-stat font-bold', t.text)}>
          {suffix ? formatNumber(Math.round(value)) : formatNumber(value)}
        </span>
        {suffix && <span className="text-body text-ink-faint">₪</span>}
        {delta && <Chip tone={deltaTone} className="num whitespace-nowrap">{delta}</Chip>}
      </div>

      {sub && <p className="text-faint leading-relaxed text-ink-faint">{sub}</p>}
    </div>
  )
}

/** صف جدول قابل للنقر — بنستعمله بجهات الاتصال والمدفوعات */
export function RowLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn('row flex items-center gap-4 px-4.5', className)}>
      {children}
    </Link>
  )
}
