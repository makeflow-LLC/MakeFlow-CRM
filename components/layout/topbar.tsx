'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, Building2, KanbanSquare, Search, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchItem {
  id: string
  label: string
  sub: string
  href: string
  kind: 'contact' | 'deal' | 'organization'
}

const KIND = {
  contact: { icon: Users, label: 'شخص' },
  deal: { icon: KanbanSquare, label: 'صفقة' },
  organization: { icon: Building2, label: 'جهة' },
} as const

/**
 * الشريط العلوي — بحث شامل، وإضافة، وإشعارات، وهوية من يعمل.
 *
 * البحث هنا هو الطريق الأسرع في النظام كله: الموظف يعرف اسم العميل أو رقمه،
 * ولا يعرف في أي شاشة هو. فالبحث يسبق التنقّل بدل أن يتبعه.
 */
export function Topbar({
  index,
  quickAdd,
  viewer,
  alerts = 0,
}: {
  index: SearchItem[]
  quickAdd?: React.ReactNode
  viewer?: { name: string; color: string } | null
  alerts?: number
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const digits = q.replace(/\D/g, '')

    return index
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.sub.toLowerCase().includes(q) ||
          (digits.length > 2 && item.sub.replace(/\D/g, '').includes(digits)),
      )
      .slice(0, 8)
  }, [index, query])

  // ⌘K / Ctrl+K يضع المؤشر في البحث من أي شاشة
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        input.current?.focus()
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // الإغلاق عند النقر خارج الصندوق
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-line bg-card px-4 py-3 md:px-7.5">
      <div ref={box} className="relative w-full max-w-[420px] flex-1">
        <div className="flex items-center gap-2.5 rounded-input border border-line bg-[#F4F5F8] px-3 py-2 transition-colors duration-150 focus-within:border-accent">
          <Search className="h-[17px] w-[17px] shrink-0 text-ink-muted" strokeWidth={1.75} />
          <input
            ref={input}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="ابحث عن عميل، صفقة أو رقم هاتف"
            className="w-full min-w-0 border-0 bg-transparent text-body text-ink outline-none placeholder:text-ink-muted"
          />
          <span className="num hidden shrink-0 rounded-[5px] border border-[#DDE0E9] px-1.5 text-[11px] text-ink-faint sm:inline-block">
            ⌘K
          </span>
        </div>

        {open && query.trim().length >= 2 && (
          <div className="absolute inset-x-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-card border border-line bg-card shadow-pop">
            {results.length === 0 ? (
              <p className="px-4 py-5 text-center text-faint text-ink-muted">
                لا نتائج لـ «{query.trim()}»
              </p>
            ) : (
              results.map((item) => {
                const { icon: Icon, label } = KIND[item.kind]
                return (
                  <Link
                    key={`${item.kind}-${item.id}`}
                    href={item.href}
                    onClick={() => { setOpen(false); setQuery('') }}
                    className="flex items-center gap-3 border-b border-line-soft px-4 py-2.5 transition-colors duration-150 last:border-0 hover:bg-head"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-chip bg-page text-ink-muted">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-semibold text-ink">
                        {item.label}
                      </span>
                      <span className="num block truncate text-faint text-ink-muted">
                        {item.sub}
                      </span>
                    </span>
                    <span className="chip shrink-0 bg-chip-neutral-bg text-chip-neutral-fg">
                      {label}
                    </span>
                  </Link>
                )
              })
            )}
          </div>
        )}
      </div>

      <div className="ms-auto flex shrink-0 items-center gap-2.5">
        {quickAdd}

        <Link
          href="/"
          aria-label={alerts > 0 ? `${alerts} تنبيهاً يحتاج انتباهك` : 'لا تنبيهات'}
          title={alerts > 0 ? `${alerts} تنبيهاً يحتاج انتباهك` : 'لا تنبيهات'}
          className="relative flex h-[38px] w-[38px] items-center justify-center rounded-input border border-line bg-card transition-colors duration-150 hover:bg-[#F4F5F8]"
        >
          <Bell className="h-[18px] w-[18px] text-[#475467]" strokeWidth={1.75} />
          {alerts > 0 && (
            <span className="absolute end-2 top-[7px] h-[7px] w-[7px] rounded-full bg-danger" />
          )}
        </Link>

        {viewer && (
          <Link
            href="/team"
            title={viewer.name}
            className={cn(
              'flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white',
            )}
            style={{ backgroundColor: viewer.color }}
          >
            {initials(viewer.name)}
          </Link>
        )}
      </div>
    </header>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => !['د.', 'أ.', 'م.'].includes(p))
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}
