/**
 * طبقة البيانات.
 *
 * فيها مسار كود واحد بس: نجلب الجداول الخام (من Supabase أو من البيانات
 * التجريبية) وبعدين نركّب الشاشات منها بدوال صافية تحت. حجم الشغل هنا
 * صغير — 3 مستخدمين وبضع مئات الصفوف — فجلب الجداول كاملة أبسط وأوضح من
 * عشرين استعلام، وبيخلي نفس المنطق يشتغل بالوضعين بدون تكرار.
 */

import { cache } from 'react'
import type {
  Activity, Contact, ContactRow, Deal, DealCard, Organization, Payment,
  PaymentRow, Pipeline, Product, QueueTask, Stage, Subscription,
  SubscriptionRow, Task, TodayStats, User,
} from '@/lib/types'
import { STUCK_HOURS } from '@/lib/constants'
import * as mock from './mock'

export interface Dataset {
  users: User[]
  products: Product[]
  pipelines: Pipeline[]
  stages: Stage[]
  organizations: Organization[]
  contacts: Contact[]
  deals: Deal[]
  activities: Activity[]
  tasks: Task[]
  payments: Payment[]
  subscriptions: Subscription[]
}

/** بنكون «حيّ» بس لما مفاتيح Supabase موجودة — غير هيك بيانات تجريبية. */
export function isLive(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

const mockDataset = (): Dataset => ({
  users: mock.users,
  products: mock.products,
  pipelines: mock.pipelines,
  stages: mock.stages,
  organizations: mock.organizations,
  contacts: mock.contacts,
  deals: mock.deals,
  activities: mock.activities,
  tasks: mock.tasks,
  payments: mock.payments,
  subscriptions: mock.subscriptions,
})

/** `cache` تجعل الطلب الواحد يجيب البيانات مرة وحدة مهما تعددت الكمبوننتس. */
export const getDataset = cache(async (): Promise<Dataset> => {
  if (!isLive()) return mockDataset()

  const { createClient } = await import('@/lib/supabase/server')
  const db = createClient()

  const tables = [
    'users', 'products', 'pipelines', 'pipeline_stages', 'organizations',
    'contacts', 'deals', 'activities', 'tasks', 'payments', 'subscriptions',
  ] as const

  const results = await Promise.all(tables.map((t) => db.from(t).select('*')))

  const failed = results.find((r) => r.error)
  if (failed?.error) {
    // ما بنكسر الشاشة — بنرجع للبيانات التجريبية وبنسجّل السبب بالـ server log
    console.error('[data] فشل جلب البيانات من Supabase:', failed.error.message)
    return mockDataset()
  }

  const [
    users, products, pipelines, stages, organizations,
    contacts, deals, activities, tasks, payments, subscriptions,
  ] = results.map((r) => r.data ?? [])

  return {
    users, products, pipelines, stages, organizations,
    contacts, deals, activities, tasks, payments, subscriptions,
  } as Dataset
})

// ---------------------------------------------------------------------------
// أدوات مساعدة
// ---------------------------------------------------------------------------

const byId = <T extends { id: string }>(rows: T[]) =>
  new Map(rows.map((r) => [r.id, r]))

export const hoursSince = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)

export { STUCK_HOURS } from '@/lib/constants'

export const paidTotalFor = (dealId: string, payments: Payment[]) =>
  payments
    .filter((p) => p.deal_id === dealId && p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)

// ---------------------------------------------------------------------------
// دوال الشاشات
// ---------------------------------------------------------------------------

export function buildDealCards(data: Dataset, pipelineId?: string): DealCard[] {
  const contacts = byId(data.contacts)
  const products = byId(data.products)
  const stages = byId(data.stages)
  const users = byId(data.users)

  return data.deals
    .filter((d) => !pipelineId || d.pipeline_id === pipelineId)
    .map((d) => ({
      ...d,
      contact: contacts.get(d.contact_id)!,
      product: products.get(d.product_id)!,
      stage: stages.get(d.stage_id)!,
      owner: d.owner_id ? users.get(d.owner_id) ?? null : null,
      hours_in_stage: hoursSince(d.stage_entered_at),
      paid_total: paidTotalFor(d.id, data.payments),
    }))
    .filter((d) => d.contact && d.product && d.stage)
}

export function stagesFor(data: Dataset, pipelineId: string): Stage[] {
  return data.stages
    .filter((s) => s.pipeline_id === pipelineId)
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function buildContactRows(data: Dataset, query = ''): ContactRow[] {
  const orgs = byId(data.organizations)
  const users = byId(data.users)
  const q = query.trim().toLowerCase()

  return data.contacts
    .filter((c) => {
      if (!q) return true
      // الرقم بيتقارن بدون رموز حتى «0599» تلاقي «+970599...»
      const digits = q.replace(/\D/g, '')
      return (
        c.full_name.toLowerCase().includes(q) ||
        (digits.length > 2 && c.phone.replace(/\D/g, '').includes(digits))
      )
    })
    .map((c) => {
      const acts = data.activities
        .filter((a) => a.contact_id === c.id)
        .sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at))
      return {
        ...c,
        organization: c.organization_id ? orgs.get(c.organization_id) ?? null : null,
        owner: c.owner_id ? users.get(c.owner_id) ?? null : null,
        deals_count: data.deals.filter((d) => d.contact_id === c.id).length,
        last_activity_at: acts[0]?.occurred_at ?? null,
      }
    })
    .sort((a, b) => (b.last_activity_at ?? '').localeCompare(a.last_activity_at ?? ''))
}

export function buildContact360(data: Dataset, contactId: string) {
  const contact = data.contacts.find((c) => c.id === contactId)
  if (!contact) return null

  const dealCards = buildDealCards(data).filter((d) => d.contact_id === contactId)
  const dealIds = new Set(dealCards.map((d) => d.id))

  const contactPayments = data.payments
    .filter((p) => dealIds.has(p.deal_id))
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))

  return {
    contact,
    organization: contact.organization_id
      ? data.organizations.find((o) => o.id === contact.organization_id) ?? null
      : null,
    owner: contact.owner_id ? data.users.find((u) => u.id === contact.owner_id) ?? null : null,
    activities: data.activities
      .filter((a) => a.contact_id === contactId)
      .sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at)),
    deals: dealCards,
    payments: contactPayments,
    lifetimeValue: contactPayments
      .filter((p) => p.status === 'paid')
      .reduce((s, p) => s + p.amount, 0),
    tasks: data.tasks.filter((t) => t.contact_id === contactId && t.status === 'open'),
  }
}

export function buildQueue(data: Dataset) {
  const contacts = byId(data.contacts)
  const deals = byId(data.deals)
  const startOfTomorrow = new Date()
  startOfTomorrow.setHours(24, 0, 0, 0)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const openTasks = data.tasks.filter((t) => t.status === 'open')

  const toQueueTask = (t: Task): QueueTask => ({
    ...t,
    contact: t.contact_id ? contacts.get(t.contact_id) ?? null : null,
    deal: t.deal_id ? deals.get(t.deal_id) ?? null : null,
    overdue: new Date(t.due_at) < startOfToday,
  })

  const dueToday = openTasks
    .filter((t) => {
      const due = new Date(t.due_at)
      return due >= startOfToday && due < startOfTomorrow
    })
    .map(toQueueTask)
    .sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at))

  const overdue = openTasks
    .filter((t) => new Date(t.due_at) < startOfToday)
    .map(toQueueTask)
    .sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at))

  const stuck = buildDealCards(data)
    .filter((d) => d.status === 'open' && d.hours_in_stage > STUCK_HOURS)
    .sort((a, b) => b.hours_in_stage - a.hours_in_stage)

  const needsChecking = buildPaymentRows(data).filter((p) => p.status === 'needs_checking')

  return { dueToday, overdue, stuck, needsChecking }
}

export function buildStats(data: Dataset): TodayStats {
  const openDeals = data.deals.filter((d) => d.status === 'open')
  const awaitingStageIds = new Set(
    data.stages.filter((s) => s.name === 'بانتظار الدفع').map((s) => s.id),
  )

  const endOfMonth = new Date()
  endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0)

  return {
    open_deals: openDeals.length,
    awaiting_payment: openDeals.filter((d) => awaitingStageIds.has(d.stage_id)).length,
    mrr: data.subscriptions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + s.monthly_amount, 0),
    renewals_this_month: data.subscriptions.filter(
      (s) =>
        s.status === 'active' &&
        s.renewal_date &&
        new Date(s.renewal_date) <= endOfMonth &&
        new Date(s.renewal_date) >= new Date(new Date().setHours(0, 0, 0, 0)),
    ).length,
  }
}

export function buildPaymentRows(data: Dataset): PaymentRow[] {
  const deals = byId(data.deals)
  const contacts = byId(data.contacts)
  const products = byId(data.products)

  return data.payments
    .map((p) => {
      const deal = deals.get(p.deal_id)
      if (!deal) return null
      return {
        ...p,
        deal,
        contact: contacts.get(deal.contact_id)!,
        product: products.get(deal.product_id)!,
      }
    })
    .filter((p): p is PaymentRow => Boolean(p?.contact && p?.product))
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
}

export function buildSubscriptionRows(data: Dataset): SubscriptionRow[] {
  const products = byId(data.products)
  const orgs = byId(data.organizations)
  const contacts = byId(data.contacts)
  const today = new Date().setHours(0, 0, 0, 0)

  return data.subscriptions
    .map((s) => ({
      ...s,
      product: products.get(s.product_id)!,
      organization: s.organization_id ? orgs.get(s.organization_id) ?? null : null,
      contact: s.contact_id ? contacts.get(s.contact_id) ?? null : null,
      days_until_renewal: s.renewal_date
        ? Math.round((new Date(s.renewal_date).setHours(0, 0, 0, 0) - today) / 86_400_000)
        : null,
    }))
    .filter((s) => s.product)
    .sort((a, b) => (a.renewal_date ?? '9999').localeCompare(b.renewal_date ?? '9999'))
}

export function buildOrganizationCards(data: Dataset) {
  return data.organizations
    .map((org) => ({
      ...org,
      people: data.contacts.filter((c) => c.organization_id === org.id),
      deals: data.deals.filter((d) => d.organization_id === org.id),
      subscriptions: data.subscriptions.filter(
        (s) => s.organization_id === org.id && s.status === 'active',
      ),
    }))
    .map((org) => ({
      ...org,
      mrr: org.subscriptions.reduce((sum, s) => sum + s.monthly_amount, 0),
    }))
}

export function buildOrganization360(data: Dataset, orgId: string) {
  const org = data.organizations.find((o) => o.id === orgId)
  if (!org) return null

  const people = data.contacts.filter((c) => c.organization_id === orgId)
  const peopleIds = new Set(people.map((p) => p.id))

  return {
    organization: org,
    owner: org.owner_id ? data.users.find((u) => u.id === org.owner_id) ?? null : null,
    people,
    deals: buildDealCards(data).filter((d) => d.organization_id === orgId),
    subscriptions: buildSubscriptionRows(data).filter((s) => s.organization_id === orgId),
    activities: data.activities
      .filter((a) => peopleIds.has(a.contact_id))
      .sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at))
      .slice(0, 20),
  }
}

// ---------------------------------------------------------------------------
// التقارير
// ---------------------------------------------------------------------------

export function buildReports(data: Dataset) {
  const products = byId(data.products)

  const dealsByStage = data.pipelines.map((pl) => ({
    pipeline: pl,
    stages: stagesFor(data, pl.id).map((s) => ({
      name: s.name,
      color: s.color,
      count: data.deals.filter((d) => d.stage_id === s.id).length,
    })),
  }))

  const conversion = data.pipelines.map((pl) => {
    const all = data.deals.filter((d) => d.pipeline_id === pl.id)
    const won = all.filter((d) => d.status === 'won').length
    const closed = all.filter((d) => d.status !== 'open').length
    return {
      pipeline: pl.name,
      total: all.length,
      won,
      lost: closed - won,
      rate: closed ? Math.round((won / closed) * 100) : 0,
    }
  })

  // الإيراد الفعلي حسب المنتج (من الدفعات المؤكدة)
  const revenueByProduct = data.products
    .map((p) => {
      const dealIds = new Set(data.deals.filter((d) => d.product_id === p.id).map((d) => d.id))
      const revenue = data.payments
        .filter((pay) => pay.status === 'paid' && dealIds.has(pay.deal_id))
        .reduce((s, pay) => s + pay.amount, 0)
      return { name: p.name, color: p.color, revenue }
    })
    .filter((r) => r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)

  const mrrByProduct = data.subscriptions
    .filter((s) => s.status === 'active')
    .reduce<Record<string, number>>((acc, s) => {
      const name = products.get(s.product_id)?.name ?? '—'
      acc[name] = (acc[name] ?? 0) + s.monthly_amount
      return acc
    }, {})

  const lostReasons = data.deals
    .filter((d) => d.status === 'lost' && d.lost_reason)
    .reduce<Record<string, number>>((acc, d) => {
      const reason = d.lost_reason!.trim()
      acc[reason] = (acc[reason] ?? 0) + 1
      return acc
    }, {})

  return {
    dealsByStage,
    conversion,
    revenueByProduct,
    mrrByProduct: Object.entries(mrrByProduct)
      .map(([name, mrr]) => ({
        name,
        mrr,
        color: data.products.find((p) => p.name === name)?.color ?? '#5B4CE0',
      }))
      .sort((a, b) => b.mrr - a.mrr),
    lostReasons: Object.entries(lostReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    totalRevenue: revenueByProduct.reduce((s, r) => s + r.revenue, 0),
  }
}
