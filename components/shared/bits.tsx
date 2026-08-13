import Link from 'next/link'
import { AlertTriangle, Bot, Calendar, FileText, Mail, MessageCircle, Phone, Sparkles, Users } from 'lucide-react'
import { Pill, SoftPill } from '@/components/ui/pill'
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
        className="inline-flex h-8 w-8 items-center justify-center rounded-pill border border-dashed border-line text-ink-muted"
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
    <span className="inline-flex items-center gap-1 rounded-pill bg-warn/15 px-2 py-1 text-[11px] font-bold text-[#B26A00]">
      <AlertTriangle className="h-3 w-3" />
      متوقفة منذ {hoursLabel(hours)}
    </span>
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
    <span className="inline-flex items-center gap-1 rounded-pill bg-[#3B9BE8]/12 px-2 py-0.5 text-[10px] font-bold text-[#1F7CC4]">
      <Bot className="h-3 w-3" />
      بوت
    </span>
  )
}

/** بطاقة رقم بالأعلى — العنوان فيه أيقونة شسـلما المصطلح غير واضح */
export function StatCard({
  label, value, term, tone = 'default', suffix,
}: {
  label: string
  value: number
  term?: TermKey
  tone?: 'default' | 'warn' | 'accent' | 'success'
  suffix?: string
}) {
  const toneClass = {
    default: 'text-ink',
    warn: 'text-warn',
    accent: 'text-accent',
    success: 'text-success',
  }[tone]

  return (
    <div className="surface p-6 transition-shadow duration-150 hover:shadow-pop">
      <p className="mb-2 flex items-center gap-1 text-sm font-semibold text-ink-muted">
        {label}
        {term && <HintTooltip term={term} />}
      </p>
      <p className={cn('num text-3xl font-bold', toneClass)}>
        {suffix ? formatMoney(value) : formatNumber(value)}
      </p>
    </div>
  )
}

/** صف جدول قابل للنقر — بنستعمله بجهات الاتصال والمدفوعات */
export function RowLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn('row flex items-center gap-4 px-6 hover:bg-page', className)}>
      {children}
    </Link>
  )
}
