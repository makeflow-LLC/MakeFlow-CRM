import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Clock, PartyPopper, Receipt } from 'lucide-react'
import { PageHeader, SectionHeader } from '@/components/hints/page-header'
import { EmptyState } from '@/components/hints/empty-state'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ActivityIcon, OwnerAvatar, ProductPill, StagePill, StatCard, StuckBadge } from '@/components/shared/bits'
import { buildQueue, buildStats, getDataset } from '@/lib/data'
import { doneStates, pageHints } from '@/lib/hints'
import { formatMoney, timeAgo } from '@/lib/utils'
import type { QueueTask } from '@/lib/types'

export default async function TodayPage() {
  const data = await getDataset()
  const stats = buildStats(data)
  const { dueToday, overdue, stuck, needsChecking } = buildQueue(data)

  const allClear =
    dueToday.length === 0 && overdue.length === 0 && stuck.length === 0 && needsChecking.length === 0

  return (
    <>
      <PageHeader title="اليوم" hint={pageHints.today} />

      {/* أربع أرقام بتلخّص الوضع */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="صفقات مفتوحة" value={stats.open_deals} term="deal" tone="accent" />
        <StatCard label="بانتظار الدفع" value={stats.awaiting_payment} tone="warn" />
        <StatCard label="الإيراد الشهري المتكرر" value={stats.mrr} term="mrr" tone="success" suffix="ILS" />
        <StatCard label="تجديدات هذا الشهر" value={stats.renewals_this_month} term="subscription" />
      </div>

      {allClear ? (
        <Card className="p-2">
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
        </Card>
      ) : (
        <div className="space-y-8">
          {/* 1. مهام اليوم */}
          <section>
            <SectionHeader title="مهام اليوم" term="task" count={dueToday.length} />
            {dueToday.length ? (
              <Card className="divide-y divide-line overflow-hidden">
                {dueToday.map((t) => <TaskRow key={t.id} task={t} />)}
              </Card>
            ) : (
              <Card className="p-2">
                <EmptyState
                  tone="done"
                  icon={<CheckCircle2 className="h-7 w-7" />}
                  title={doneStates.tasksToday.title}
                  body={doneStates.tasksToday.body}
                />
              </Card>
            )}
          </section>

          {/* 2. مهام متأخرة */}
          <section>
            <SectionHeader title="مهام متأخرة" count={overdue.length} tone="danger" />
            {overdue.length ? (
              <Card className="divide-y divide-line overflow-hidden">
                {overdue.map((t) => <TaskRow key={t.id} task={t} overdue />)}
              </Card>
            ) : (
              <Card className="p-2">
                <EmptyState
                  tone="done"
                  icon={<CheckCircle2 className="h-7 w-7" />}
                  title={doneStates.overdue.title}
                  body={doneStates.overdue.body}
                />
              </Card>
            )}
          </section>

          {/* 3. صفقات عالقة */}
          <section>
            <SectionHeader title="صفقات متوقفة" term="stuckSince" count={stuck.length} />
            {stuck.length ? (
              <Card className="divide-y divide-line overflow-hidden">
                {stuck.map((d) => (
                  <Link
                    key={d.id}
                    href={`/contacts/${d.contact_id}`}
                    className="row flex flex-wrap items-center gap-4 px-6 py-3 hover:bg-page"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{d.contact.full_name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <ProductPill product={d.product} />
                        <StagePill stage={d.stage} />
                      </div>
                    </div>
                    <StuckBadge hours={d.hours_in_stage} />
                    <span className="num text-sm font-bold text-ink">{formatMoney(d.value, d.currency)}</span>
                    <OwnerAvatar owner={d.owner} />
                  </Link>
                ))}
              </Card>
            ) : (
              <Card className="p-2">
                <EmptyState
                  tone="done"
                  icon={<CheckCircle2 className="h-7 w-7" />}
                  title={doneStates.stuck.title}
                  body={doneStates.stuck.body}
                />
              </Card>
            )}
          </section>

          {/* 4. دفعات تحتاج تحقق */}
          <section>
            <SectionHeader title="دفعات بانتظار التحقق" term="needsChecking" count={needsChecking.length} />
            {needsChecking.length ? (
              <Card className="divide-y divide-line overflow-hidden">
                {needsChecking.map((p) => (
                  <div key={p.id} className="row flex flex-wrap items-center gap-4 px-6 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-input bg-warn/12 text-warn">
                      <Receipt className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{p.contact.full_name}</p>
                      <p className="truncate text-xs text-ink-muted">{p.product.name}</p>
                    </div>
                    <span className="num text-sm font-bold text-ink">{formatMoney(p.amount, p.currency)}</span>
                    <Button asChild size="sm" variant="soft">
                      <Link href="/payments">راجع الإيصال</Link>
                    </Button>
                  </div>
                ))}
              </Card>
            ) : (
              <Card className="p-2">
                <EmptyState
                  tone="done"
                  icon={<CheckCircle2 className="h-7 w-7" />}
                  title={doneStates.paymentsToCheck.title}
                  body={doneStates.paymentsToCheck.body}
                />
              </Card>
            )}
          </section>
        </div>
      )}
    </>
  )
}

function TaskRow({ task, overdue = false }: { task: QueueTask; overdue?: boolean }) {
  return (
    <div
      className={
        // الحد على بداية السطر — بالعربي هذا اليمين، وينعكس لحاله بالإنجليزي
        overdue
          ? 'row flex flex-wrap items-center gap-4 border-s-4 border-s-danger bg-danger/[0.03] px-6 py-3'
          : 'row flex flex-wrap items-center gap-4 px-6 py-3'
      }
    >
      <span
        className={
          overdue
            ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-input bg-danger/12 text-danger'
            : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-input bg-accent-soft text-accent'
        }
      >
        {overdue ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{task.title}</p>
        <p className="truncate text-xs text-ink-muted">
          {task.contact ? task.contact.full_name : 'غير مرتبطة بشخص'}
          {' · '}
          <span className={overdue ? 'font-semibold text-danger' : ''}>{timeAgo(task.due_at)}</span>
        </p>
      </div>

      {task.contact && (
        <Button asChild size="sm" variant="outline">
          <Link href={`/contacts/${task.contact.id}`}>افتح الملف</Link>
        </Button>
      )}
    </div>
  )
}
