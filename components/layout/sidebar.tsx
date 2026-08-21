'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  BarChart3, Building2, ChevronDown, CreditCard, KanbanSquare, MoreHorizontal,
  Package, RefreshCw, Sun, UserCog, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', label: 'اليوم', icon: Sun },
  { href: '/deals', label: 'الصفقات', icon: KanbanSquare },
  { href: '/contacts', label: 'جهات الاتصال', icon: Users },
  { href: '/organizations', label: 'الجهات', icon: Building2 },
  { href: '/subscriptions', label: 'الاشتراكات', icon: RefreshCw },
  { href: '/payments', label: 'المدفوعات', icon: CreditCard },
  { href: '/reports', label: 'التقارير', icon: BarChart3 },
  { href: '/products', label: 'المنتجات', icon: Package },
  { href: '/team', label: 'الفريق', icon: UserCog },
]

export interface NavBadges {
  /** عدّ يظهر بجانب عنصر التنقّل — مفتاحه المسار */
  [href: string]: number | undefined
}

export interface SeatInfo {
  members: number
  seats: number
}

/**
 * الشريط الجانبي — لوح داكن ثابت بعرض 246px.
 *
 * الداكن هنا ليس زينة: يفصل التنقّل عن المحتوى فصلاً بصرياً حاداً، فتبقى
 * البطاقات البيضاء على الرمادي الفاتح هي ما تقع عليه العين أولاً.
 */
export function Sidebar({ badges = {}, seats }: { badges?: NavBadges; seats?: SeatInfo }) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside className="sticky top-0 hidden h-screen w-[246px] shrink-0 flex-col self-start bg-nav px-3.5 py-4.5 text-white md:flex">
      {/* الشعار */}
      <div className="flex items-center gap-[11px] px-2 pb-[22px] pt-1">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-input bg-accent text-[17px] font-bold text-white">
          M
        </span>
        <span className="flex min-w-0 flex-col leading-[1.25]">
          <span className="truncate text-[15px] font-semibold">Makeflow</span>
          <span className="truncate text-xs text-nav-muted">إدارة العملاء</span>
        </span>
        <ChevronDown className="ms-auto h-3.5 w-3.5 shrink-0 text-nav-muted" />
      </div>

      <nav className="flex flex-col gap-[3px]">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          const badge = badges[href]

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-[11px] rounded-input px-3 py-2.5 text-body-lg transition-colors duration-150',
                active
                  ? 'bg-accent font-semibold text-white'
                  : 'font-medium text-nav-ink hover:bg-nav-hover',
              )}
            >
              <Icon
                className="h-[19px] w-[19px] shrink-0"
                strokeWidth={active ? 2.25 : 1.75}
              />
              <span className="truncate">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className="num ms-auto min-w-[20px] rounded-pill bg-[#F5A623] px-1.5 py-px text-center text-chip font-semibold text-[#12142B]">
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* بطاقة المقاعد — تحذير هادئ حين يتجاوز الفريق ما صُمّم له */}
      {seats && (
        <div className="mt-auto rounded-[11px] bg-nav-raised p-3.5">
          <p className="pb-1 text-[13px] font-semibold">خطة الفريق</p>
          <p className="num pb-2.5 text-xs text-nav-muted">
            {seats.members} أعضاء من {seats.seats} مقاعد
          </p>
          <div className="h-1.5 overflow-hidden rounded-pill bg-nav-line">
            <div
              className="h-full rounded-pill bg-[#F5A623]"
              style={{ width: `${Math.min((seats.members / Math.max(seats.seats, 1)) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </aside>
  )
}

/**
 * شريط سفلي للهاتف.
 *
 * لا تتسع الشاشة لتسعة عناصر، لكن قصّ القائمة يجعل الشاشات المتبقية بلا
 * أي طريق إليها. فأربعة عناصر يومية في الشريط، والبقية خلف «المزيد».
 */
const PRIMARY = 4

export function MobileNav() {
  const pathname = usePathname()
  const [more, setMore] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const primary = NAV.slice(0, PRIMARY)
  const rest = NAV.slice(PRIMARY)
  const restActive = rest.some((n) => isActive(n.href))

  return (
    <>
      <nav className="fixed bottom-0 right-0 left-0 z-40 flex items-stretch justify-around bg-nav md:hidden">
        {primary.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold transition-colors duration-150',
                active ? 'text-white' : 'text-nav-muted',
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={() => setMore(true)}
          className={cn(
            'flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold transition-colors duration-150',
            restActive ? 'text-white' : 'text-nav-muted',
          )}
        >
          <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
          <span className="truncate">المزيد</span>
        </button>
      </nav>

      <Dialog open={more} onOpenChange={setMore}>
        <DialogContent className="max-w-sm">
          <DialogTitle>باقي الشاشات</DialogTitle>
          <div className="mt-4 grid gap-1">
            {rest.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMore(false)}
                className={cn(
                  'flex items-center gap-3 rounded-input px-3 py-3 text-body-lg font-semibold transition-colors duration-150',
                  isActive(href) ? 'bg-accent text-white' : 'text-ink hover:bg-page',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                {label}
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
