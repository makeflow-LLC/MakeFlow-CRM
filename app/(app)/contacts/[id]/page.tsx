import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Building2, FileText, Phone, Receipt } from 'lucide-react'
import { PageHeader, SectionHeader } from '@/components/hints/page-header'
import { EmptyState } from '@/components/hints/empty-state'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogActivity } from '@/components/contacts/log-activity'
import { DeleteContact } from '@/components/contacts/delete-contact'
import { AddDeal } from '@/components/shared/add-dialogs'
import { AddReminder } from '@/components/shared/add-reminder'
import { AddPayment } from '@/components/payments/add-payment'
import { Avatar } from '@/components/ui/avatar'
import { HintTooltip } from '@/components/hints/hint-tooltip'
import {
  ActivityIcon, BotBadge, OwnerAvatar, ProductPill, StagePill, StuckBadge,
} from '@/components/shared/bits'
import { buildContact360, buildDealCards, getDataset } from '@/lib/data'
import { STUCK_HOURS } from '@/lib/constants'
import { emptyStates, pageHints } from '@/lib/hints'
import { formatDate, formatMoney, timeAgo } from '@/lib/utils'

const SOURCE_LABELS: Record<string, string> = {
  whatsapp_bot: 'بوت واتساب',
  facebook_ad: 'إعلان فيسبوك',
  referral: 'توصية',
  workshop: 'ورشة',
  manual: 'إدخال يدوي',
  other: 'أخرى',
}

const PAYMENT_LABELS: Record<string, string> = {
  paid: 'مدفوعة',
  needs_checking: 'بانتظار التحقق',
  not_paid: 'غير مدفوعة',
  refunded: 'مرتجعة',
}

export default async function ContactPage({ params }: { params: { id: string } }) {
  const data = await getDataset()
  const view = buildContact360(data, params.id)
  if (!view) notFound()

  const { contact, organization, owner, activities, deals, payments, lifetimeValue } = view

  // صفقات هذا الشخص وحدها في قائمة تسجيل الدفعة — لا كل صفقات النظام
  const contactDeals = buildDealCards(data).filter((d) => d.contact_id === contact.id)

  return (
    <>
      <PageHeader
        title={contact.full_name}
        hint={pageHints.contactDetail}
        action={<AddReminder contacts={[]} presetContactId={contact.id} label="ذكّرني" />}
      />

      {/* يمين: المعلومات · وسط: الخط الزمني · يسار: الصفقات والمدفوعات */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* ---------- العمود اليمين ---------- */}
        <div className="space-y-6">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar name={contact.full_name} color={owner?.avatar_color ?? '#9AA4B2'} className="h-12 w-12 text-sm" />
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-ink">{contact.full_name}</p>
                  <p className="truncate text-xs text-ink-muted">{contact.city ?? '—'}</p>
                </div>
              </div>

              <dl className="space-y-3 text-sm">
                <Row label="الهاتف">
                  <a href={`tel:${contact.phone}`} className="num font-semibold text-accent hover:underline">
                    {contact.phone}
                  </a>
                </Row>
                <Row label="البريد الإلكتروني">{contact.email ?? '—'}</Row>
                <Row label={<span className="inline-flex items-center gap-1">المصدر <HintTooltip term="source" /></span>}>
                  {SOURCE_LABELS[contact.source] ?? contact.source}
                </Row>
                <Row label={<span className="inline-flex items-center gap-1">المسؤول <HintTooltip term="owner" /></span>}>
                  <span className="flex items-center gap-2">
                    <OwnerAvatar owner={owner} />
                    <span className="text-ink">{owner?.full_name ?? 'غير مُسنَد'}</span>
                  </span>
                </Row>
                <Row label="تاريخ التسجيل">{formatDate(contact.created_at)}</Row>
              </dl>

              <Button asChild variant="outline" className="w-full">
                <a href={`tel:${contact.phone}`}>
                  <Phone className="h-4 w-4" />
                  اتصل
                </a>
              </Button>

              {/* الحذف آخر ما في البطاقة، ومفصول بخط — إجراء لا يُضغط سهواً */}
              <div className="border-t border-line pt-3">
                <DeleteContact contactId={contact.id} fullName={contact.full_name} />
              </div>
            </CardBody>
          </Card>

          {/* الجهة */}
          <Card>
            <CardHeader>
              <CardTitle>
                الجهة
                <HintTooltip term="organization" />
              </CardTitle>
            </CardHeader>
            <CardBody>
              {organization ? (
                <Link href={`/organizations/${organization.id}`} className="group block">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-input bg-accent-soft text-accent">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink group-hover:text-accent">
                        {organization.name}
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        {contact.role_in_org ?? organization.sector ?? '—'}
                      </p>
                    </div>
                  </div>
                </Link>
              ) : (
                <p className="text-sm leading-relaxed text-ink-muted">
                  غير مرتبط بأي جهة، وهذا معتاد: طلاب الأكاديمية يسجّلون كأفراد.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* ---------- العمود الأوسط: الخط الزمني ---------- */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>
              النشاط
              <HintTooltip term="activity" />
            </CardTitle>
            <span className="text-xs text-ink-muted">مرتّب من الأحدث</span>
          </CardHeader>

          <div className="flex-1 space-y-4 p-6">
            {activities.length ? (
              activities.map((a) => (
                <div key={a.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-page text-ink-muted">
                      <ActivityIcon type={a.type} />
                    </span>
                    <span className="mt-1 w-px flex-1 bg-line" />
                  </div>

                  <div className="min-w-0 flex-1 pb-2">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{a.summary}</p>
                      {a.source === 'bot' && <BotBadge />}
                    </div>
                    {a.body && (
                      <p className="mb-1 rounded-input bg-page p-3 text-sm leading-relaxed text-ink-muted">
                        {a.body}
                      </p>
                    )}
                    <p className="text-xs text-ink-muted">{timeAgo(a.occurred_at)}</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={<FileText className="h-7 w-7" />}
                title={emptyStates.activities.title}
                body={emptyStates.activities.body}
              />
            )}
          </div>

          {/* صندوق تسجيل النشاط — ملاصق لتحت */}
          <div className="sticky bottom-0 rounded-b-card border-t border-line bg-card p-4">
            <LogActivity contactId={contact.id} />
          </div>
        </Card>

        {/* ---------- العمود اليسار ---------- */}
        <div className="space-y-6">
          {/* القيمة الإجمالية */}
          <Card>
            <CardBody>
              <p className="mb-2 flex items-center gap-1 text-sm font-semibold text-ink-muted">
                القيمة الإجمالية
                <HintTooltip term="lifetimeValue" />
              </p>
              <p className="num text-3xl font-bold text-success">{formatMoney(lifetimeValue)}</p>
            </CardBody>
          </Card>

          {/* الصفقات */}
          <div>
            <SectionHeader title="الصفقات" term="deal" count={deals.length} />
            {deals.length ? (
              <div className="space-y-3">
                {deals.map((d) => (
                  <Card key={d.id} className="space-y-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <ProductPill product={d.product} />
                      <StagePill stage={d.stage} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="num text-sm font-bold text-ink">
                        {formatMoney(d.value, d.currency)}
                      </span>
                      {d.paid_total > 0 && (
                        <span className="text-xs font-semibold text-success">
                          المسدَّد <span className="num">{formatMoney(d.paid_total)}</span>
                        </span>
                      )}
                    </div>
                    {d.status === 'open' && d.hours_in_stage > STUCK_HOURS && (
                      <StuckBadge hours={d.hours_in_stage} />
                    )}
                    {d.lost_reason && (
                      <p className="rounded-input bg-danger/8 px-2 py-1 text-[11px] text-danger">
                        {d.lost_reason}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                className="py-8"
                title={emptyStates.contactDeals.title}
                body={emptyStates.contactDeals.body}
                action={
                  <AddDeal
                    contacts={[]}
                    products={data.products}
                    presetContactId={contact.id}
                    label={emptyStates.contactDeals.action}
                    size="sm"
                  />
                }
              />
            )}
          </div>

          {/* المدفوعات */}
          <div>
            <SectionHeader
              title="المدفوعات"
              term="payment"
              count={payments.length}
              action={
                contactDeals.length > 0 ? (
                  <AddPayment deals={contactDeals} variant="soft" label="سجّل دفعة" />
                ) : undefined
              }
            />
            {payments.length ? (
              <Card className="divide-y divide-line overflow-hidden">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-input bg-page text-ink-muted">
                      <Receipt className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="num text-sm font-bold text-ink">{formatMoney(p.amount, p.currency)}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {PAYMENT_LABELS[p.status]} · {formatDate(p.paid_at ?? p.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </Card>
            ) : (
              <p className="rounded-card bg-page px-4 py-6 text-center text-sm text-ink-muted">
                لا توجد دفعات مسجَّلة لهذا الشخص.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-xs font-semibold text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-sm text-ink">{children}</dd>
    </div>
  )
}
