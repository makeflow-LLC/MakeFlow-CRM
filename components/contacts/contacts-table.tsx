'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Users } from 'lucide-react'
import { EmptyState } from '@/components/hints/empty-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { OwnerAvatar } from '@/components/shared/bits'
import { AddContact } from '@/components/shared/add-dialogs'
import { HintTooltip } from '@/components/hints/hint-tooltip'
import { emptyStates, microcopy } from '@/lib/hints'
import { Chip } from '@/components/ui/pill'
import { cn, formatNumber, timeAgo } from '@/lib/utils'

/** المصدر بالعربية — يظهر سطراً صغيراً تحت الاسم */
const SOURCE_LABELS: Record<string, string> = {
  whatsapp_bot: 'بوت واتساب',
  facebook_ad: 'إعلان فيسبوك',
  referral: 'توصية',
  workshop: 'ورشة',
  manual: 'إدخال يدوي',
  other: 'أخرى',
}
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

  const GRID = 'grid-cols-[minmax(230px,1.5fr)_150px_180px_80px_110px_90px] gap-4'

  return (
    <>
      {!rows.length ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title={emptyStates.contacts.title}
          body={emptyStates.contacts.body}
          action={<AddContact contacts={rows} label={emptyStates.contacts.action} />}
        />
      ) : (
        <Card className="overflow-hidden">
          {/* شريط الأدوات: البحث على اليمين والعدّ على الطرف المقابل */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-4.5 py-3.5">
            <div className="relative w-full max-w-[280px]">
              <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={microcopy.buttons.search}
                className="h-[38px] w-full rounded-input border border-line bg-[#F4F5F8] ps-3 pe-9 text-body text-ink transition-colors duration-150 placeholder:text-ink-faint focus:border-accent focus:bg-card focus:outline-none"
              />
            </div>
            <span className="text-faint text-ink-muted">
              <span className="num font-semibold text-ink">{formatNumber(filtered.length)}</span>
              {' من '}
              <span className="num">{formatNumber(rows.length)}</span>
            </span>
          </div>

          {!filtered.length ? (
            <div className="px-7.5 py-12 text-center">
              <p className="mb-1 text-section font-semibold text-ink">
                {emptyStates.contactsSearch.title}
              </p>
              <p className="text-body text-ink-muted">{emptyStates.contactsSearch.body}</p>
            </div>
          ) : (
            /* شبكة لا flex: الأعمدة الثابتة تسحق عمود الاسم على الشاشات الضيّقة */
            <div className="overflow-x-auto scroll-slim">
              <div className="min-w-[820px]">
                <div className={cn('thead grid px-4.5 py-3', GRID)}>
                  <span>الاسم</span>
                  <span>الهاتف</span>
                  <span className="inline-flex items-center gap-1">
                    الجهة <HintTooltip term="organization" />
                  </span>
                  <span className="inline-flex items-center gap-1">
                    الصفقات <HintTooltip term="deal" />
                  </span>
                  <span className="inline-flex items-center gap-1">
                    آخر نشاط <HintTooltip term="activity" />
                  </span>
                  <span className="inline-flex items-center gap-1">
                    المسؤول <HintTooltip term="owner" />
                  </span>
                </div>

                <div className="divide-y divide-line-soft">
                  {filtered.map((c) => (
                    <Link
                      key={c.id}
                      href={`/contacts/${c.id}`}
                      className={cn('row grid items-center px-4.5 py-3', GRID)}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={c.full_name} color={c.owner?.avatar_color ?? '#98A2B3'} />
                        <div className="min-w-0">
                          <p className="truncate text-body font-semibold text-ink">{c.full_name}</p>
                          <p className="truncate text-[11.5px] text-ink-faint">
                            {SOURCE_LABELS[c.source] ?? '—'}
                          </p>
                        </div>
                      </div>

                      <span className="num truncate text-body text-ink-muted">{c.phone}</span>
                      <span className="truncate text-body text-ink-muted">
                        {c.organization?.name ?? '—'}
                      </span>
                      <span>
                        <Chip tone="accent" className="num">{formatNumber(c.deals_count)}</Chip>
                      </span>
                      <span className="truncate text-faint text-ink-muted">
                        {timeAgo(c.last_activity_at)}
                      </span>
                      <span><OwnerAvatar owner={c.owner} /></span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  )
}
