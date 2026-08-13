'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Users } from 'lucide-react'
import { EmptyState } from '@/components/hints/empty-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { OwnerAvatar } from '@/components/shared/bits'
import { HintTooltip } from '@/components/hints/hint-tooltip'
import { emptyStates, microcopy } from '@/lib/hints'
import { formatNumber, timeAgo } from '@/lib/utils'
import type { ContactRow } from '@/lib/types'

export function ContactsTable({ rows }: { rows: ContactRow[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    const digits = q.replace(/\D/g, '')
    return rows.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (digits.length > 2 && c.phone.replace(/\D/g, '').includes(digits)),
    )
  }, [rows, query])

  return (
    <>
      {/* البحث هو العنصر الأساسي — كبير وفوق */}
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-ink-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={microcopy.buttons.search}
          className="h-14 w-full rounded-card border border-line bg-card ps-4 pe-12 text-base text-ink shadow-card transition-colors duration-150 placeholder:text-ink-muted hover:border-[#D3D8E3] focus:border-accent focus:outline-none"
        />
      </div>

      {!rows.length ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title={emptyStates.contacts.title}
          body={emptyStates.contacts.body}
          action={<Button>{emptyStates.contacts.action}</Button>}
        />
      ) : !filtered.length ? (
        <EmptyState
          icon={<Search className="h-7 w-7" />}
          title={emptyStates.contactsSearch.title}
          body={emptyStates.contactsSearch.body}
          action={<Button>{emptyStates.contactsSearch.action}</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          {/* ترويسة الجدول — تظهر على الشاشات الكبيرة فقط */}
          <div className="hidden items-center gap-4 border-b border-line bg-page/60 px-6 py-3 text-xs font-bold text-ink-muted lg:flex">
            <span className="flex-1">الاسم</span>
            <span className="w-[140px]">الهاتف</span>
            <span className="w-[160px] items-center gap-1 inline-flex">
              الجهة <HintTooltip term="organization" />
            </span>
            <span className="w-[90px] items-center gap-1 inline-flex">
              الصفقات <HintTooltip term="deal" />
            </span>
            <span className="w-[110px] items-center gap-1 inline-flex">
              آخر نشاط <HintTooltip term="activity" />
            </span>
            <span className="w-[70px] items-center gap-1 inline-flex">
              المسؤول <HintTooltip term="owner" />
            </span>
          </div>

          <div className="divide-y divide-line">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/contacts/${c.id}`}
                className="row flex flex-wrap items-center gap-4 px-6 py-3 transition-colors duration-150 hover:bg-page"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={c.full_name} color={c.owner?.avatar_color ?? '#9AA4B2'} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{c.full_name}</p>
                    <p className="num truncate text-xs text-ink-muted lg:hidden">{c.phone}</p>
                  </div>
                </div>

                <span className="num hidden w-[140px] text-sm text-ink-muted lg:block">{c.phone}</span>
                <span className="hidden w-[160px] truncate text-sm text-ink-muted lg:block">
                  {c.organization?.name ?? '—'}
                </span>
                <span className="num hidden w-[90px] text-sm font-semibold text-ink lg:block">
                  {formatNumber(c.deals_count)}
                </span>
                <span className="hidden w-[110px] truncate text-xs text-ink-muted lg:block">
                  {timeAgo(c.last_activity_at)}
                </span>
                <span className="hidden w-[70px] lg:block">
                  <OwnerAvatar owner={c.owner} />
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}
