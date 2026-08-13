import { RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/hints/page-header'
import { EmptyState } from '@/components/hints/empty-state'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HintTooltip } from '@/components/hints/hint-tooltip'
import { buildSubscriptionRows, getDataset } from '@/lib/data'
import { emptyStates, pageHints } from '@/lib/hints'
import { cn, daysLabel, formatMoney, formatNumber } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  active: 'فعّال',
  paused: 'موقوف مؤقتاً',
  churned: 'منتهٍ',
}

export default async function SubscriptionsPage() {
  const data = await getDataset()
  const rows = buildSubscriptionRows(data)
  const active = rows.filter((s) => s.status === 'active')
  const mrr = active.reduce((sum, s) => sum + s.monthly_amount, 0)

  // توزيع الدخل حسب المنتج — شريط واحد بألوان المنتجات
  const byProduct = Object.values(
    active.reduce<Record<string, { name: string; color: string; amount: number }>>((acc, s) => {
      const key = s.product.id
      acc[key] ??= { name: s.product.name, color: s.product.color, amount: 0 }
      acc[key].amount += s.monthly_amount
      return acc
    }, {}),
  ).sort((a, b) => b.amount - a.amount)

  return (
    <>
      <PageHeader title="الاشتراكات" hint={pageHints.subscriptions} term="subscription" />

      {rows.length ? (
        <>
          {/* الرقم الكبير + شريط التوزيع */}
          <Card className="mb-6 p-6">
            <p className="mb-1 flex items-center gap-1 text-sm font-semibold text-ink-muted">
              الإيراد الشهري المتكرر
              <HintTooltip term="mrr" />
            </p>
            <p className="num mb-1 text-5xl font-bold text-ink">{formatMoney(mrr)}</p>
            <p className="mb-6 text-sm text-ink-muted">
              من <span className="num font-bold text-ink">{formatNumber(active.length)}</span> اشتراكاً فعّالاً
            </p>

            {byProduct.length > 0 && (
              <>
                <div className="mb-3 flex h-3 w-full overflow-hidden rounded-pill bg-page">
                  {byProduct.map((p) => (
                    <div
                      key={p.name}
                      title={`${p.name}: ${formatMoney(p.amount)}`}
                      style={{ width: `${(p.amount / mrr) * 100}%`, backgroundColor: p.color }}
                      className="transition-all duration-150"
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-4">
                  {byProduct.map((p) => (
                    <span key={p.name} className="flex items-center gap-2 text-xs">
                      <span className="h-3 w-3 rounded-[4px]" style={{ backgroundColor: p.color }} />
                      <span className="font-semibold text-ink">{p.name}</span>
                      <span className="num text-ink-muted">{formatMoney(p.amount)}</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* الجدول — مرتّب حسب موعد التجديد */}
          <Card className="overflow-hidden">
            <div className="hidden items-center gap-4 border-b border-line bg-page/60 px-6 py-3 text-xs font-bold text-ink-muted lg:flex">
              <span className="flex-1">الجهة / الشخص</span>
              <span className="w-[180px]">الباقة</span>
              <span className="w-[110px]">شهرياً</span>
              <span className="w-[140px]">التجديد</span>
              <span className="w-[110px]">الحالة</span>
            </div>

            <div className="divide-y divide-line">
              {rows.map((s) => {
                const d = s.days_until_renewal
                const overdue = s.status === 'active' && d !== null && d < 0
                const soon = s.status === 'active' && d !== null && d >= 0 && d <= 7

                return (
                  <div
                    key={s.id}
                    className={cn(
                      'row flex flex-wrap items-center gap-4 px-6 py-3',
                      overdue && 'border-s-4 border-s-danger bg-danger/[0.03]',
                      soon && 'border-s-4 border-s-warn bg-warn/[0.04]',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">
                        {s.organization?.name ?? s.contact?.full_name ?? '—'}
                      </p>
                      <p className="truncate text-xs text-ink-muted lg:hidden">{s.plan_name ?? s.product.name}</p>
                    </div>

                    <span className="hidden w-[180px] truncate text-sm text-ink-muted lg:block">
                      {s.plan_name ?? s.product.name}
                    </span>
                    <span className="w-[110px] text-sm font-bold text-ink">
                      <span className="num">{formatMoney(s.monthly_amount, s.currency)}</span>
                    </span>
                    <span
                      className={cn(
                        'w-[140px] text-xs font-bold',
                        overdue ? 'text-danger' : soon ? 'text-warn' : 'text-ink-muted',
                      )}
                    >
                      {daysLabel(d)}
                    </span>
                    <span className="w-[110px] text-xs font-semibold text-ink-muted">
                      {STATUS_LABELS[s.status]}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      ) : (
        <EmptyState
          icon={<RefreshCw className="h-7 w-7" />}
          title={emptyStates.subscriptions.title}
          body={emptyStates.subscriptions.body}
          action={<Button>{emptyStates.subscriptions.action}</Button>}
        />
      )}
    </>
  )
}
