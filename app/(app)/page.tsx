import Link from 'next/link'
import {
  AlertTriangle, Banknote, CheckCircle2, HandCoins, PartyPopper, Receipt,
  RefreshCw, Wallet,
} from 'lucide-react'
import { PageHeader } from '@/components/hints/page-header'
import { EmptyState } from '@/components/hints/empty-state'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/pill'
import { OwnerAvatar, ProductPill, StagePill, StatCard, StuckBadge } from '@/components/shared/bits'
import { TaskRow } from '@/components/shared/task-row'
import { AddReminder } from '@/components/shared/add-reminder'
import { AddPayment } from '@/components/payments/add-payment'
import { buildDealCards, buildQueue, buildStats, getDataset } from '@/lib/data'
import { doneStates, pageHints } from '@/lib/hints'
import { formatMoney, toBase } from '@/lib/utils'

export default async function TodayPage() {
  const data = await getDataset()
  const stats = buildStats(data)
  const deals = buildDealCards(data)
  const { dueToday, overdue, stuck, needsChecking } = buildQueue(data)
  const base = data.money.base

  const allClear =
    dueToday.length === 0 && overdue.length === 0 && stuck.length === 0 && needsChecking.length === 0

  const stuckValue = stuck.reduce((sum, d) => sum + toBase(d.value, d.currency, data.money), 0)

  return (
    <>
      <PageHeader
        title="اليوم"
        hint={pageHints.today}
        crumb="المنصة"
        action={
          <>
            <AddReminder contacts={data.contacts} />
            <AddPayment deals={deals} money={data.money} variant="outline" />
          </>
        }
      />

      {/* أربعة أرقام تلخّص المال: المتوقَّع، المقبوض، المعلَّق، المتكرّر */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <StatCard
          label="قيمة الصفقات المفتوحة" value={stats.open_value} term="deal"
          tone="accent" currency={base}
          icon={<HandCoins className="h-4 w-4" />}
          delta={`${stats.open_deals} صفقة`}
          deltaTone="accent"
          sub={`منها ${stats.awaiting_payment} بانتظار الدفع`}
        />
        <StatCard
          label="حصّلته هذا الشهر" value={stats.collected_this_month}
          tone="success" currency={base}
          icon={<Wallet className="h-4 w-4" />}
          sub="مجموع الدفعات المؤكَّدة منذ أول الشهر"
        />
        <StatCard
          label="بِعته ولم تقبضه" value={stats.uncollected}
          tone="warn" currency={base}
          icon={<Banknote className="h-4 w-4" />}
          sub="صفقات وصلت مرحلة الدفع أو نجحت، ولم يُسجَّل مقابلها كاملاً"
        />
        <StatCard
          label="الإيراد الشهري المتكرر" value={stats.mrr} term="mrr" currency={base}
          icon={<RefreshCw className="h-4 w-4" />}
          delta={`${stats.renewals_this_month} تجديداً`}
          deltaTone="neutral"
          sub="يصلك دون بيع جديد"
        />
      </div>

      {allClear ? (
        <div className="pt-5">
          <EmptyState
            tone="done"
            icon={<PartyPopper className="h-7 w-7" />}
            title={doneStates.today.title}
            body={doneStates.today.body}
            action={
              <Button asChild>
                <Link href="/deals">{doneStates.today.action}</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-start gap-4.5 pt-5">
          {/* ---------- عمود المهام ---------- */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>
                مهامك اليوم
                {dueToday.length > 0 && <Chip tone="accent" className="num">{dueToday.length}</Chip>}
              </CardTitle>
              <span className="text-faint text-ink-muted">مرتّبة بالوقت</span>
            </CardHeader>

            {dueToday.length ? (
              <div className="divide-y divide-line-soft">
                {dueToday.map((t) => <TaskRow key={t.id} task={t} />)}
              </div>
            ) : (
              <CardBody>
                <p className="flex items-center gap-2 rounded-input bg-chip-success-bg px-4 py-3 text-body text-chip-success-fg">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {doneStates.tasksToday.title}
                </p>
              </CardBody>
            )}

            {/* المتأخرة داخل البطاقة نفسها بخلفية منبّهة — لا قسماً منفصلاً
                يسهل تجاوزه بالتمرير */}
            {overdue.length > 0 && (
              <div className="border-t border-line-soft bg-[#FEF6F6]">
                <div className="flex items-center gap-2 px-4.5 pb-1 pt-3.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-chip-danger-fg" />
                  <span className="text-body font-semibold text-chip-danger-fg">متأخرة</span>
                  <span className="num rounded-pill bg-danger px-2 py-0.5 text-chip font-semibold text-white">
                    {overdue.length}
                  </span>
                </div>
                <div className="divide-y divide-[#F7E3E3]">
                  {overdue.map((t) => <TaskRow key={t.id} task={t} overdue />)}
                </div>
              </div>
            )}
          </Card>

          {/* ---------- عمود المتابعة ---------- */}
          <div className="grid gap-4.5">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>
                  صفقات متوقفة
                  {stuck.length > 0 && <Chip tone="warn" className="num">{stuck.length}</Chip>}
                </CardTitle>
                {stuckValue > 0 && (
                  <span className="num text-faint font-semibold text-ink">
                    {formatMoney(stuckValue, base)}
                  </span>
                )}
              </CardHeader>

              {stuck.length ? (
                <div className="divide-y divide-line-soft">
                  {stuck.map((d) => (
                    <Link
                      key={d.id}
                      href={`/contacts/${d.contact_id}`}
                      className="row flex flex-wrap items-center gap-3 px-4.5 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-lg font-semibold text-ink">
                          {d.contact.full_name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <ProductPill product={d.product} />
                          <StagePill stage={d.stage} />
                        </div>
                      </div>
                      <StuckBadge hours={d.hours_in_stage} />
                      <span className="num shrink-0 text-body-lg font-bold text-ink">
                        {formatMoney(d.value, d.currency)}
                      </span>
                      <OwnerAvatar owner={d.owner} />
                    </Link>
                  ))}
                </div>
              ) : (
                <CardBody>
                  <p className="flex items-center gap-2 rounded-input bg-chip-success-bg px-4 py-3 text-body text-chip-success-fg">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {doneStates.stuck.title}
                  </p>
                </CardBody>
              )}
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>
                  إيصالات تنتظر التحقق
                  {needsChecking.length > 0 && (
                    <Chip tone="warn" className="num">{needsChecking.length}</Chip>
                  )}
                </CardTitle>
              </CardHeader>

              {needsChecking.length ? (
                <div className="divide-y divide-line-soft">
                  {needsChecking.map((p) => (
                    <div key={p.id} className="row flex flex-wrap items-center gap-3 px-4.5 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-chip bg-chip-warn-bg text-chip-warn-fg">
                        <Receipt className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-lg font-semibold text-ink">
                          {p.contact.full_name}
                        </p>
                        <p className="truncate text-faint text-ink-muted">{p.product.name}</p>
                      </div>
                      <span className="num shrink-0 text-body-lg font-bold text-ink">
                        {formatMoney(p.amount, p.currency)}
                      </span>
                      <Button asChild size="sm" variant="success">
                        <Link href="/payments">راجع الإيصال</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <CardBody>
                  <p className="flex items-center gap-2 rounded-input bg-chip-success-bg px-4 py-3 text-body text-chip-success-fg">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {doneStates.paymentsToCheck.title}
                  </p>
                </CardBody>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
