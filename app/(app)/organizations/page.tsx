import Link from 'next/link'
import { Building2, Users } from 'lucide-react'
import { PageHeader } from '@/components/hints/page-header'
import { EmptyState } from '@/components/hints/empty-state'
import { Chip } from '@/components/ui/pill'
import { AddOrganization } from '@/components/organizations/add-organization'
import { buildOrganizationCards, getDataset } from '@/lib/data'
import { emptyStates, pageHints } from '@/lib/hints'
import { cn, formatMoney, formatNumber } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  clinic: 'عيادة',
  salon: 'صالون',
  shop: 'محل',
  company: 'شركة',
  school: 'مركز تعليمي',
  other: 'أخرى',
}

/** لكل نوع جهة لونه الفاتح — يميّز الشبكة بلمحة دون قراءة الأسماء */
const TYPE_TONES: Record<string, string> = {
  clinic: 'bg-chip-blue-bg text-chip-blue-fg',
  salon: 'bg-chip-pink-bg text-chip-pink-fg',
  shop: 'bg-chip-warn-bg text-chip-warn-fg',
  company: 'bg-chip-accent-bg text-chip-accent-fg',
  school: 'bg-chip-success-bg text-chip-success-fg',
  other: 'bg-chip-neutral-bg text-chip-neutral-fg',
}

export default async function OrganizationsPage() {
  const data = await getDataset()
  const orgs = buildOrganizationCards(data)

  return (
    <>
      <PageHeader
        title="الجهات"
        hint={pageHints.organizations}
        term="organization"
        action={<AddOrganization />}
      />

      {orgs.length ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
          {orgs.map((org) => (
            <Link
              key={org.id}
              href={`/organizations/${org.id}`}
              className="group flex h-full flex-col rounded-card border border-line bg-card p-4.5 transition-colors duration-150 hover:border-accent"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-chip',
                    TYPE_TONES[org.type] ?? TYPE_TONES.other,
                  )}
                >
                  <Building2 className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink">{org.name}</p>
                  <p className="truncate text-faint text-ink-muted">
                    {TYPE_LABELS[org.type] ?? org.type}
                    {org.city ? ` · ${org.city}` : ''}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-soft pt-3.5 text-faint">
                <span className="flex items-center gap-1 text-ink-muted">
                  <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span className="num font-semibold text-ink">{formatNumber(org.people.length)}</span> أشخاص
                </span>
                <span className="text-ink-muted">
                  <span className="num font-semibold text-ink">{formatNumber(org.deals.length)}</span> صفقة
                </span>
                <span className="ms-auto">
                  {org.mrr > 0 ? (
                    <Chip tone="success" className="num">{formatMoney(org.mrr)}/شهر</Chip>
                  ) : (
                    <Chip tone="neutral">لا اشتراك</Chip>
                  )}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Building2 className="h-7 w-7" />}
          title={emptyStates.organizations.title}
          body={emptyStates.organizations.body}
          action={<AddOrganization label={emptyStates.organizations.action} />}
        />
      )}
    </>
  )
}
