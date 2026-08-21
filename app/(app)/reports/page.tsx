import Link from 'next/link'
import { Banknote, BarChart3, HandCoins, Trophy, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/hints/page-header'
import { EmptyState } from '@/components/hints/empty-state'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HintTooltip } from '@/components/hints/hint-tooltip'
import { HtmlBars, MonthlyRevenueChart } from '@/components/shared/report-charts'
import { StatCard } from '@/components/shared/bits'
import { Chip } from '@/components/ui/pill'
import { buildReports, getDataset } from '@/lib/data'
import { emptyStates, pageHints } from '@/lib/hints'
import { formatMoney, formatNumber } from '@/lib/utils'

const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export default async function ReportsPage() {
  const data = await getDataset()
  const r = buildReports(data)

  // الإيراد الفعلي لكل شهر من آخر 6 شهور
  const monthly: { month: string; revenue: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i, 1)
    const revenue = data.payments
      .filter((p) => {
        if (p.status !== 'paid' || !p.paid_at) return false
        const paid = new Date(p.paid_at)
        return paid.getFullYear() === d.getFullYear() && paid.getMonth() === d.getMonth()
      })
      .reduce((s, p) => s + p.amount, 0)
    monthly.push({ month: AR_MONTHS[d.getMonth()], revenue })
  }

  const hasData = data.deals.length > 0

  if (!hasData) {
    return (
      <>
        <PageHeader title="التقارير" hint={pageHints.reports} />
        <EmptyState
          icon={<BarChart3 className="h-7 w-7" />}
          title={emptyStates.reports.title}
          body={emptyStates.reports.body}
          action={<Button asChild><Link href="/deals">{emptyStates.reports.action}</Link></Button>}
        />
      </>
    )
  }

  return (
    <>
      <PageHeader title="التقارير" hint={pageHints.reports} />

      {/* المال أولاً: من المتوقَّع إلى المقبوض، والفجوة بينهما ظاهرة */}
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
        <StatCard
          label="قيمة الصفقات المفتوحة" value={r.money.openValue} suffix="ILS" tone="accent"
          icon={<HandCoins className="h-4 w-4" />}
          sub="مال متوقَّع، لم يُحسم بعد"
        />
        <StatCard
          label="قيمة الصفقات الناجحة" value={r.money.wonValue} suffix="ILS"
          icon={<Trophy className="h-4 w-4" />}
          sub="ما اتُّفق عليه فعلاً"
        />
        <StatCard
          label="المقبوض" value={r.money.collected} suffix="ILS" tone="success"
          icon={<Wallet className="h-4 w-4" />}
          sub="دفعات مؤكَّدة دخلت الصندوق"
        />
        <StatCard
          label="بِعته ولم تقبضه" value={r.money.uncollected} suffix="ILS" tone="warn"
          icon={<Banknote className="h-4 w-4" />}
          sub="الفرق بين ما بِعته وما سجّلت قبضه"
        />
      </div>

      {/* نسبة التحويل لكل مسار */}
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
        {r.conversion.map((c) => (
          <Card key={c.pipeline} className="p-4.5">
            <p className="mb-1 flex items-center gap-1 text-[13px] font-medium text-ink-muted">
              نسبة التحويل — {c.pipeline}
              <HintTooltip term="conversionRate" />
            </p>
            <p className="num mb-3 text-stat font-bold text-accent">{c.rate}%</p>
            <div className="mb-3 h-2 overflow-hidden rounded-pill bg-page">
              <div className="h-full rounded-pill bg-accent" style={{ width: `${c.rate}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-faint text-ink-muted">
              <span>الإجمالي <span className="num font-semibold text-ink">{formatNumber(c.total)}</span></span>
              <span>ناجحة <span className="num font-semibold text-chip-success-fg">{formatNumber(c.won)}</span></span>
              <span>خاسرة <span className="num font-semibold text-chip-danger-fg">{formatNumber(c.lost)}</span></span>
            </div>
          </Card>
        ))}
      </div>

      {/* الصفقات حسب المرحلة — بالعدد وبالمال */}
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-4">
        {r.dealsByStage.map((p) => (
          <Card key={p.pipeline.id}>
            <CardHeader>
              <CardTitle>
                الصفقات حسب المرحلة — {p.pipeline.name}
                <HintTooltip term="stage" />
              </CardTitle>
              <span className="num text-sm font-bold text-ink">
                {formatMoney(p.stages.reduce((sum, s) => sum + s.value, 0))}
              </span>
            </CardHeader>
            <CardBody className="space-y-6">
              <div>
                <p className="mb-2 text-xs font-bold text-ink-muted">عدد الصفقات</p>
                <HtmlBars rows={p.stages.map((s) => ({ name: s.name, color: s.color, value: s.count }))} />
              </div>
              <div>
                <p className="mb-2 text-xs font-bold text-ink-muted">قيمتها بالشيكل</p>
                <HtmlBars
                  format="money"
                  rows={p.stages.map((s) => ({ name: s.name, color: s.color, value: s.value }))}
                />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-4">
        {/* الإيراد حسب المنتج */}
        <Card>
          <CardHeader>
            <CardTitle>المقبوض حسب المنتج</CardTitle>
            <span className="num text-sm font-bold text-ink">{formatMoney(r.totalRevenue)}</span>
          </CardHeader>
          <CardBody>
            <HtmlBars
              format="money"
              rows={r.revenueByProduct.map((x) => ({ name: x.name, color: x.color, value: x.revenue }))}
            />
          </CardBody>
        </Card>

        {/* الإيراد شهرياً */}
        <Card>
          <CardHeader>
            <CardTitle>الإيراد شهرياً</CardTitle>
            <span className="text-xs text-ink-muted">آخر ستة أشهر</span>
          </CardHeader>
          <CardBody>
            <MonthlyRevenueChart data={monthly} />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-4">
        {/* الدخل الشهري المتكرر حسب المنتج */}
        <Card>
          <CardHeader>
            <CardTitle>
              الدخل الشهري المتكرر
              <HintTooltip term="mrr" />
            </CardTitle>
          </CardHeader>
          <CardBody>
            <HtmlBars
              format="money"
              rows={r.mrrByProduct.map((m) => ({ name: m.name, color: m.color, value: m.mrr }))}
            />
          </CardBody>
        </Card>

        {/* أكثر أسباب الخسارة */}
        <Card>
          <CardHeader>
            <CardTitle>أكثر أسباب الخسارة</CardTitle>
          </CardHeader>
          <CardBody>
            {r.lostReasons.length ? (
              <ul className="space-y-3">
                {r.lostReasons.map((l) => (
                  <li key={l.reason} className="flex items-center justify-between gap-4 border-b border-line-soft pb-3 last:border-0 last:pb-0">
                    <span className="min-w-0 flex-1 text-body text-ink">{l.reason}</span>
                    <Chip tone="danger" className="num shrink-0">{formatNumber(l.count)}</Chip>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-12 text-center text-sm leading-relaxed text-ink-muted">
                لم نخسر أي صفقة حتى الآن.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  )
}
