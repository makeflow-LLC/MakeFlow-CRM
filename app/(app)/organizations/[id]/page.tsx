import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Building2, Users } from 'lucide-react'
import { PageHeader, SectionHeader } from '@/components/hints/page-header'
import { EmptyState } from '@/components/hints/empty-state'
import { Card, CardBody } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { ActivityIcon, BotBadge, ProductPill, StagePill } from '@/components/shared/bits'
import { buildOrganization360, getDataset } from '@/lib/data'
import { emptyStates, pageHints } from '@/lib/hints'
import { daysLabel, formatMoney, timeAgo } from '@/lib/utils'

export default async function OrganizationPage({ params }: { params: { id: string } }) {
  const data = await getDataset()
  const view = buildOrganization360(data, params.id)
  if (!view) notFound()

  const { organization, people, deals, subscriptions, activities } = view
  const mrr = subscriptions.filter((s) => s.status === 'active').reduce((s, x) => s + x.monthly_amount, 0)

  return (
    <>
      <PageHeader title={organization.name} hint={pageHints.organizationDetail} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-input bg-accent-soft text-accent">
                  <Building2 className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-ink">{organization.name}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {organization.sector ?? '—'}{organization.city ? ` · ${organization.city}` : ''}
                  </p>
                </div>
              </div>
              {organization.notes && (
                <p className="rounded-input bg-page p-3 text-sm leading-relaxed text-ink-muted">
                  {organization.notes}
                </p>
              )}
              <div className="border-t border-line pt-4">
                <p className="mb-1 text-xs font-semibold text-ink-muted">الدخل الشهري من هذه الجهة</p>
                <p className="num text-2xl font-bold text-success">{formatMoney(mrr)}</p>
              </div>
            </CardBody>
          </Card>

          <div>
            <SectionHeader title="الأشخاص" count={people.length} />
            {people.length ? (
              <Card className="divide-y divide-line overflow-hidden">
                {people.map((p) => (
                  <Link key={p.id} href={`/contacts/${p.id}`} className="row flex items-center gap-3 px-4 py-3 hover:bg-page">
                    <Avatar name={p.full_name} color="#9AA4B2" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{p.full_name}</p>
                      <p className="truncate text-xs text-ink-muted">{p.role_in_org ?? '—'}</p>
                    </div>
                  </Link>
                ))}
              </Card>
            ) : (
              <EmptyState className="py-8" title={emptyStates.orgPeople.title} body={emptyStates.orgPeople.body} />
            )}
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <SectionHeader title="الاشتراكات" term="subscription" count={subscriptions.length} />
            {subscriptions.length ? (
              <Card className="divide-y divide-line overflow-hidden">
                {subscriptions.map((s) => (
                  <div key={s.id} className="row flex flex-wrap items-center gap-4 px-6 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{s.plan_name ?? s.product.name}</p>
                      <p className="truncate text-xs text-ink-muted">{s.product.name}</p>
                    </div>
                    <span className="text-sm font-bold text-ink"><span className="num">{formatMoney(s.monthly_amount)}</span>/شهر</span>
                    <span className="text-xs font-semibold text-ink-muted">{daysLabel(s.days_until_renewal)}</span>
                  </div>
                ))}
              </Card>
            ) : (
              <p className="rounded-card bg-page px-4 py-6 text-center text-sm text-ink-muted">
                لا توجد اشتراكات فعّالة مع هذه الجهة.
              </p>
            )}
          </section>

          <section>
            <SectionHeader title="الصفقات" term="deal" count={deals.length} />
            {deals.length ? (
              <Card className="divide-y divide-line overflow-hidden">
                {deals.map((d) => (
                  <Link key={d.id} href={`/contacts/${d.contact_id}`} className="row flex flex-wrap items-center gap-4 px-6 py-3 hover:bg-page">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{d.contact.full_name}</p>
                      <div className="mt-1"><ProductPill product={d.product} /></div>
                    </div>
                    <StagePill stage={d.stage} />
                    <span className="num text-sm font-bold text-ink">{formatMoney(d.value, d.currency)}</span>
                  </Link>
                ))}
              </Card>
            ) : (
              <p className="rounded-card bg-page px-4 py-6 text-center text-sm text-ink-muted">
                لا توجد صفقات مع هذه الجهة بعد.
              </p>
            )}
          </section>

          <section>
            <SectionHeader title="آخر الأنشطة" term="activity" />
            {activities.length ? (
              <Card className="divide-y divide-line overflow-hidden">
                {activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 px-6 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-page text-ink-muted">
                      <ActivityIcon type={a.type} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-ink">{a.summary}</p>
                        {a.source === 'bot' && <BotBadge />}
                      </div>
                      <p className="text-xs text-ink-muted">{timeAgo(a.occurred_at)}</p>
                    </div>
                  </div>
                ))}
              </Card>
            ) : (
              <p className="rounded-card bg-page px-4 py-6 text-center text-sm text-ink-muted">
                لا يوجد نشاط مسجَّل مع أشخاص هذه الجهة.
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
