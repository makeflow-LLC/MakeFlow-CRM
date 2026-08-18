'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  BarChart3, Building2, CreditCard, KanbanSquare, MoreHorizontal, Package,
  PanelRightClose, PanelRightOpen, RefreshCw, Sun, UserCog, Users,
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

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-l border-line bg-card transition-all duration-150 md:flex',
        collapsed ? 'w-[76px]' : 'w-[248px]',
      )}
    >
      {/* الشعار */}
      <div className="flex h-16 items-center gap-3 border-b border-line px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-input bg-accent text-sm font-bold text-white">
          M
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink">Makeflow</p>
            <p className="truncate text-xs text-ink-muted">إدارة العملاء</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scroll-slim">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-input px-3 py-2.5 text-sm font-semibold transition-all duration-150',
                active
                  ? 'bg-accent text-white shadow-card'
                  : 'text-ink-muted hover:bg-page hover:text-ink',
                collapsed && 'justify-center px-0',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-3 border-t border-line px-4 py-4 text-sm font-semibold text-ink-muted transition-colors duration-150 hover:text-ink"
      >
        {/* الأيقونة مرآة — بالعربي الطي يتجه لليمين */}
        {collapsed ? (
          <PanelRightOpen className="h-5 w-5 shrink-0" />
        ) : (
          <>
            <PanelRightClose className="h-5 w-5 shrink-0" />
            <span>طيّ القائمة</span>
          </>
        )}
      </button>
    </aside>
  )
}

/**
 * شريط سفلي للهاتف.
 *
 * لا تتسع الشاشة لثمانية عناصر، لكن قصّ القائمة يجعل الشاشات المتبقية بلا
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
      <nav className="fixed bottom-0 right-0 left-0 z-40 flex items-stretch justify-around border-t border-line bg-card md:hidden">
        {primary.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold transition-colors duration-150',
                active ? 'text-accent' : 'text-ink-muted',
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={() => setMore(true)}
          className={cn(
            'flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold transition-colors duration-150',
            restActive ? 'text-accent' : 'text-ink-muted',
          )}
        >
          <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
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
                  'flex items-center gap-3 rounded-input px-3 py-3 text-sm font-semibold transition-colors duration-150',
                  isActive(href)
                    ? 'bg-accent text-white'
                    : 'text-ink hover:bg-page',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                {label}
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
