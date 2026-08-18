import Link from 'next/link'
import { BarChart3 } from 'lucide-react'
import { PageHeader } from '@/components/hints/page-header'
import { EmptyState } from '@/components/hints/empty-state'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HintTooltip } from '@/components/hints/hint-tooltip'
import { HtmlBars, MonthlyRevenueChart } from '@/components/shared/report-charts'
import { StatCard } from '@/components/shared/bits'
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
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="قيمة الصفقات المفتوحة" value={r.money.openValue} suffix="ILS" tone="accent"
          sub="مال متوقَّع، لم يُحسم بعد"
        />
        <StatCard
          label="قيمة الصفقات الناجحة" value={r.money.wonValue} suffix="ILS"
          sub="ما اتُّفق عليه فعلاً"
        />
        <StatCard
          label="المقبوض" value={r.money.collected} suffix="ILS" tone="success"
          sub="دفعات مؤكَّدة دخلت الصندوق"
        />
        <StatCard
          label="بِعته ولم تقبضه" value={r.money.uncollected} suffix="ILS" tone="warn"
          sub="الفرق بين ما بِعته وما سجّلت قبضه"
        />
      </div>

      {/* نسبة التحويل لكل مسار */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {r.conversion.map((c) => (
          <Card key={c.pipeline} className="p-6">
            <p className="mb-2 flex items-center gap-1 text-sm font-semibold text-ink-muted">
              نسبة التحويل — {c.pipeline}
              <HintTooltip term="conversionRate" />
            </p>
            <p className="num mb-3 text-4xl font-bold text-accent">{c.rate}%</p>
            <div className="flex flex-wrap gap-4 text-xs text-ink-muted">
              <span>الإجمالي <span className="num font-bold text-ink">{formatNumber(c.total)}</span></span>
              <span>ناجحة <span className="num font-bold text-success">{formatNumber(c.won)}</span></span>
              <span>خاسرة <span className="num font-bold text-danger">{formatNumber(c.lost)}</span></span>
            </div>
          </Card>
        ))}
      </div>

      {/* الصفقات حسب المرحلة — بالعدد وبالمال */}
      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
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

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
                  <li key={l.reason} className="flex items-center justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
                    <span className="min-w-0 flex-1 text-sm text-ink">{l.reason}</span>
                    <span className="num shrink-0 rounded-pill bg-danger/10 px-3 py-1 text-xs font-bold text-danger">
                      {formatNumber(l.count)}
                    </span>
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
