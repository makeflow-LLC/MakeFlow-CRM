import { RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/hints/page-header'
import { EmptyState } from '@/components/hints/empty-state'
import { Card } from '@/components/ui/card'
import { Chip } from '@/components/ui/pill'
import { AddSubscription } from '@/components/shared/add-dialogs'
import { SubscriptionActions } from '@/components/subscriptions/subscription-actions'
import { HintTooltip } from '@/components/hints/hint-tooltip'
import { buildSubscriptionRows, getDataset } from '@/lib/data'
import { emptyStates, pageHints } from '@/lib/hints'
import { cn, daysLabel, formatMoney, formatNumber, toBase } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  active: 'فعّال',
  paused: 'موقوف مؤقتاً',
  churned: 'منتهٍ',
}

export default async function SubscriptionsPage() {
  const data = await getDataset()
  const rows = buildSubscriptionRows(data)
  const base = data.money.base
  const active = rows.filter((s) => s.status === 'active')
  const mrr = active.reduce((sum, s) => sum + toBase(s.monthly_amount, s.currency, data.money), 0)
  const renewalsSoon = active.filter(
    (s) => s.days_until_renewal !== null && s.days_until_renewal >= 0 && s.days_until_renewal <= 7,
  ).length

  const GRID = 'grid-cols-[minmax(220px,1.5fr)_160px_110px_140px_100px_130px] gap-3'

  // توزيع الدخل حسب المنتج — شريط واحد بألوان المنتجات
  const byProduct = Object.values(
    active.reduce<Record<string, { name: string; color: string; amount: number }>>((acc, s) => {
      const key = s.product.id
      acc[key] ??= { name: s.product.name, color: s.product.color, amount: 0 }
      acc[key].amount += toBase(s.monthly_amount, s.currency, data.money)
      return acc
    }, {}),
  ).sort((a, b) => b.amount - a.amount)

  return (
    <>
      <PageHeader
        title="الاشتراكات"
        hint={pageHints.subscriptions}
        term="subscription"
        action={
          <AddSubscription
            organizations={data.organizations}
            contacts={data.contacts}
            products={data.products}
          />
        }
      />

      {rows.length ? (
        <>
          {/* الرقم الكبير على سطح داكن — الدخل الثابت أهمّ رقم في الشاشة،
              والتباين هو ما يجعله يُقرأ أولاً */}
          <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
            <div className="rounded-card bg-nav p-4.5 text-white">
              <p className="mb-1 flex items-center gap-1 text-[13px] font-medium text-nav-muted">
                الإيراد الشهري المتكرر
                <HintTooltip term="mrr" />
              </p>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pb-1.5">
                <span className="num text-[40px] font-bold leading-none">
                  {formatMoney(Math.round(mrr), base)}
                </span>
                <span className="num rounded-pill bg-[#12B76A]/20 px-2 py-0.5 text-chip font-semibold text-[#6CE9A6]">
                  {formatNumber(active.length)} فعّال
                </span>
              </div>
              <p className="text-faint text-nav-muted">
                يصلك شهرياً دون بيع جديد
                {renewalsSoon > 0 && (
                  <> · <span className="num">{renewalsSoon}</span> تجديداً خلال أسبوع</>
                )}
              </p>
            </div>

            {byProduct.length > 0 && (
              <Card className="p-4.5">
                <p className="mb-3 text-[13px] font-medium text-ink-muted">التوزيع حسب المنتج</p>
                <div className="mb-3 flex h-3 w-full overflow-hidden rounded-pill bg-page">
                  {byProduct.map((p) => (
                    <div
                      key={p.name}
                      title={`${p.name}: ${formatMoney(p.amount, base)}`}
                      style={{ width: `${(p.amount / mrr) * 100}%`, backgroundColor: p.color }}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {byProduct.map((p) => (
                    <span key={p.name} className="flex items-center gap-1.5 text-faint">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: p.color }} />
                      <span className="font-semibold text-ink">{p.name}</span>
                      <span className="num text-ink-muted">{formatMoney(p.amount, base)}</span>
                    </span>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* الجدول — مرتّب حسب موعد التجديد */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto scroll-slim">
              <div className="min-w-[780px]">
                <div className={cn('thead grid px-4.5 py-3', GRID)}>
                  <span>الجهة / الشخص</span>
                  <span>الباقة</span>
                  <span>شهرياً</span>
                  <span>التجديد</span>
                  <span>الحالة</span>
                  <span className="text-end">إجراءات</span>
                </div>

                <div className="divide-y divide-line-soft">
                  {rows.map((s) => {
                    const d = s.days_until_renewal
                    const overdue = s.status === 'active' && d !== null && d < 0
                    const soon = s.status === 'active' && d !== null && d >= 0 && d <= 7

                    return (
                      <div key={s.id} className={cn('row grid items-center px-4.5 py-3', GRID)}>
                        <p className="truncate text-body font-semibold text-ink">
                          {s.organization?.name ?? s.contact?.full_name ?? '—'}
                        </p>
                        <span className="truncate text-body text-ink-muted">
                          {s.plan_name ?? s.product.name}
                        </span>
                        <span className="num text-body font-bold text-ink">
                          {formatMoney(s.monthly_amount, s.currency)}
                        </span>
                        <span>
                          <Chip tone={overdue ? 'danger' : soon ? 'warn' : 'neutral'}>
                            {daysLabel(d)}
                          </Chip>
                        </span>
                        <span
                          className={cn(
                            'text-faint font-semibold',
                            s.status === 'active' ? 'text-chip-success-fg' : 'text-chip-danger-fg',
                          )}
                        >
                          {STATUS_LABELS[s.status]}
                        </span>
                        <SubscriptionActions
                          id={s.id}
                          name={s.organization?.name ?? s.contact?.full_name ?? 'الاشتراك'}
                          active={s.status === 'active'}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <EmptyState
          icon={<RefreshCw className="h-7 w-7" />}
          title={emptyStates.subscriptions.title}
          body={emptyStates.subscriptions.body}
          action={
            <AddSubscription
              organizations={data.organizations}
              contacts={data.contacts}
              products={data.products}
              label={emptyStates.subscriptions.action}
            />
          }
        />
      )}
    </>
  )
}
