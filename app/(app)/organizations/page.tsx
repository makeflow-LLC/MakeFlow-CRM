import Link from 'next/link'
import { Building2, Users } from 'lucide-react'
import { PageHeader } from '@/components/hints/page-header'
import { EmptyState } from '@/components/hints/empty-state'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { buildOrganizationCards, getDataset } from '@/lib/data'
import { emptyStates, pageHints } from '@/lib/hints'
import { formatMoney, formatNumber } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  clinic: 'عيادة',
  salon: 'صالون',
  shop: 'محل',
  company: 'شركة',
  school: 'مركز تعليمي',
  other: 'أخرى',
}

export default async function OrganizationsPage() {
  const data = await getDataset()
  const orgs = buildOrganizationCards(data)

  return (
    <>
      <PageHeader title="الجهات" hint={pageHints.organizations} term="organization" />

      {orgs.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {orgs.map((org) => (
            <Link key={org.id} href={`/organizations/${org.id}`}>
              <Card className="h-full space-y-4 p-6 transition-shadow duration-150 hover:shadow-pop">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-input bg-accent-soft text-accent">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-ink">{org.name}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {TYPE_LABELS[org.type] ?? org.type}
                      {org.city ? ` · ${org.city}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t border-line pt-4 text-xs">
                  <span className="flex items-center gap-1 text-ink-muted">
                    <Users className="h-3.5 w-3.5" />
                    <span className="num font-bold text-ink">{formatNumber(org.people.length)}</span> أشخاص
                  </span>
                  <span className="text-ink-muted">
                    <span className="num font-bold text-ink">{formatNumber(org.deals.length)}</span> صفقات
                  </span>
                  {org.mrr > 0 && (
                    <span className="me-auto font-bold text-success">
                      <span className="num">{formatMoney(org.mrr)}</span>/شهر
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Building2 className="h-7 w-7" />}
          title={emptyStates.organizations.title}
          body={emptyStates.organizations.body}
          action={<Button>{emptyStates.organizations.action}</Button>}
        />
      )}
    </>
  )
}
