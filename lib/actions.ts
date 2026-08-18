'use server'

/**
 * عمليات الحفظ.
 *
 * تعمل على الخادم لا في المتصفح، فتمرّ بجلسة المستخدم وتخضع لسياسات RLS،
 * ولا يصل أي مفتاح إلى الصفحة. كل دالة تعيد نتيجة موحّدة { ok, error }
 * برسالة عربية جاهزة للعرض، ثم تحدّث الشاشات المتأثرة تلقائياً.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/utils'
import type { ContactSource, OrgType } from '@/lib/types'

export interface ActionResult {
  ok: boolean
  error?: string
  id?: string
  /** مسار الصفقة الجديدة، لننقل المستخدم إلى اللوحة التي هبطت فيها */
  pipelineId?: string
}

const FAILED = 'لم يتم الحفظ. أعد المحاولة، فإن تكرّر الأمر فأبلغنا به.'

/** يترجم أخطاء قاعدة البيانات إلى جملة يفهمها غير التقني. */
function readableError(message: string, kind: 'contact' | 'organization' | 'deal' | 'activity') {
  const m = message.toLowerCase()

  if (m.includes('duplicate key') || m.includes('unique')) {
    if (kind === 'contact') return 'هذا الرقم مسجَّل مسبقاً لشخص آخر.'
    if (kind === 'organization') return 'توجد جهة بهذا الاسم مسبقاً.'
    return 'هذا السجل موجود مسبقاً.'
  }
  if (m.includes('contacts_phone_check')) {
    return 'صيغة رقم الهاتف غير صحيحة. يجب أن يبدأ بـ ‎+970‎ أو ‎+972‎.'
  }
  if (m.includes('row-level security') || m.includes('permission denied')) {
    return 'انتهت جلستك. سجّل الدخول مرة أخرى ثم أعد المحاولة.'
  }
  return FAILED
}

/** معرّف الموظف المتصل، ليُسنَد إليه ما ينشئه. */
async function currentStaffId(db: ReturnType<typeof createClient>): Promise<string | null> {
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null

  const { data } = await db.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
  return data?.id ?? null
}

// ---------------------------------------------------------------------------
// جهة اتصال
// ---------------------------------------------------------------------------

export async function createContact(input: {
  full_name: string
  phone: string
  city?: string
  email?: string
  organization_id?: string
  role_in_org?: string
  source?: ContactSource
}): Promise<ActionResult> {
  const db = createClient()
  const phone = normalizePhone(input.phone)

  if (!input.full_name.trim()) return { ok: false, error: 'أدخل الاسم.' }
  if (!/^\+(970|972)[0-9]{8,9}$/.test(phone)) {
    return { ok: false, error: 'يجب أن يبدأ الرقم بـ ‎+970‎ أو ‎+972‎' }
  }

  // فحص التكرار قبل المحاولة، لنعطي رسالة أوضح من خطأ قاعدة البيانات
  const { data: existing } = await db
    .from('contacts').select('id, full_name').eq('phone', phone).maybeSingle()

  if (existing) {
    return { ok: false, error: `هذا الرقم مسجَّل باسم ${existing.full_name}.`, id: existing.id }
  }

  const owner = await currentStaffId(db)

  const { data, error } = await db.from('contacts').insert({
    full_name: input.full_name.trim(),
    phone,
    city: input.city?.trim() || null,
    email: input.email?.trim() || null,
    organization_id: input.organization_id || null,
    role_in_org: input.role_in_org?.trim() || null,
    source: input.source ?? 'manual',
    owner_id: owner,
  }).select('id').single()

  if (error) return { ok: false, error: readableError(error.message, 'contact') }

  revalidatePath('/contacts')
  revalidatePath('/')
  return { ok: true, id: data.id }
}

// ---------------------------------------------------------------------------
// جهة (شركة / عيادة / محل)
// ---------------------------------------------------------------------------

export async function createOrganization(input: {
  name: string
  type?: OrgType
  city?: string
  sector?: string
  notes?: string
}): Promise<ActionResult> {
  const db = createClient()

  if (!input.name.trim()) return { ok: false, error: 'أدخل اسم الجهة.' }

  const owner = await currentStaffId(db)

  const { data, error } = await db.from('organizations').insert({
    name: input.name.trim(),
    type: input.type ?? 'other',
    city: input.city?.trim() || null,
    sector: input.sector?.trim() || null,
    notes: input.notes?.trim() || null,
    owner_id: owner,
  }).select('id').single()

  if (error) return { ok: false, error: readableError(error.message, 'organization') }

  revalidatePath('/organizations')
  return { ok: true, id: data.id }
}

// ---------------------------------------------------------------------------
// صفقة
// ---------------------------------------------------------------------------

export async function createDeal(input: {
  contact_id: string
  product_id: string
  value?: number
}): Promise<ActionResult> {
  const db = createClient()

  if (!input.contact_id) return { ok: false, error: 'اختر العميل.' }
  if (!input.product_id) return { ok: false, error: 'اختر المنتج.' }

  const [{ data: contact }, { data: product }] = await Promise.all([
    db.from('contacts').select('id, full_name, organization_id, owner_id')
      .eq('id', input.contact_id).single(),
    db.from('products').select('id, name, kind, default_price, currency')
      .eq('id', input.product_id).single(),
  ])

  if (!contact || !product) return { ok: false, error: FAILED }

  // المسار يتبع نوع المنتج، والخدمات تشارك الشركات لوحتها
  const { data: pipelines } = await db.from('pipelines').select('id, product_kind')
  const pipeline =
    pipelines?.find((p) => p.product_kind === product.kind) ??
    pipelines?.find((p) => p.product_kind === 'subscription')

  if (!pipeline) return { ok: false, error: FAILED }

  const { data: stages } = await db
    .from('pipeline_stages').select('id, sort_order, is_won, is_lost')
    .eq('pipeline_id', pipeline.id).order('sort_order')

  const firstStage = stages?.find((s) => !s.is_won && !s.is_lost)
  if (!firstStage) return { ok: false, error: FAILED }

  const owner = contact.owner_id ?? (await currentStaffId(db))

  const { data, error } = await db.from('deals').insert({
    title: `${contact.full_name} — ${product.name}`,
    contact_id: contact.id,
    organization_id: contact.organization_id,
    product_id: product.id,
    pipeline_id: pipeline.id,
    stage_id: firstStage.id,
    value: input.value ?? product.default_price ?? 0,
    currency: product.currency,
    owner_id: owner,
  }).select('id').single()

  if (error) return { ok: false, error: readableError(error.message, 'deal') }

  revalidatePath('/deals')
  revalidatePath('/')
  revalidatePath(`/contacts/${contact.id}`)
  return { ok: true, id: data.id, pipelineId: pipeline.id }
}

// ---------------------------------------------------------------------------
// نشاط
// ---------------------------------------------------------------------------

export async function createActivity(input: {
  contact_id: string
  summary: string
  type?: 'whatsapp' | 'call' | 'meeting' | 'note' | 'email'
  deal_id?: string
  body?: string
}): Promise<ActionResult> {
  const db = createClient()

  if (!input.contact_id) return { ok: false, error: 'اختر الشخص.' }
  if (!input.summary.trim()) return { ok: false, error: 'اكتب ما جرى باختصار.' }

  const staff = await currentStaffId(db)

  const { data, error } = await db.from('activities').insert({
    contact_id: input.contact_id,
    deal_id: input.deal_id || null,
    type: input.type ?? 'note',
    direction: input.type === 'call' || input.type === 'meeting' ? 'out' : 'none',
    summary: input.summary.trim(),
    body: input.body?.trim() || null,
    created_by: staff,
    source: 'manual',
  }).select('id').single()

  if (error) return { ok: false, error: readableError(error.message, 'activity') }

  revalidatePath(`/contacts/${input.contact_id}`)
  revalidatePath('/contacts')
  return { ok: true, id: data.id }
}

// ---------------------------------------------------------------------------
// اشتراك
// ---------------------------------------------------------------------------

export async function createSubscription(input: {
  product_id: string
  monthly_amount: number
  organization_id?: string
  contact_id?: string
  plan_name?: string
  renewal_date?: string
}): Promise<ActionResult> {
  const db = createClient()

  if (!input.product_id) return { ok: false, error: 'اختر المنتج.' }
  if (!input.organization_id && !input.contact_id) {
    return { ok: false, error: 'اختر الجهة أو الشخص صاحب الاشتراك.' }
  }
  if (!(input.monthly_amount > 0)) {
    return { ok: false, error: 'أدخل المبلغ الشهري بالأرقام.' }
  }

  const owner = await currentStaffId(db)
  const today = new Date().toISOString().slice(0, 10)

  // بلا تاريخ تجديد يصبح الاشتراك غير قابل للمتابعة، فنفترض شهراً من اليوم
  const renewal = input.renewal_date || (() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return d.toISOString().slice(0, 10)
  })()

  const { data, error } = await db.from('subscriptions').insert({
    product_id: input.product_id,
    organization_id: input.organization_id || null,
    contact_id: input.organization_id ? null : input.contact_id || null,
    plan_name: input.plan_name?.trim() || null,
    monthly_amount: input.monthly_amount,
    start_date: today,
    renewal_date: renewal,
    status: 'active',
    owner_id: owner,
  }).select('id').single()

  if (error) return { ok: false, error: readableError(error.message, 'deal') }

  revalidatePath('/subscriptions')
  revalidatePath('/')
  return { ok: true, id: data.id }
}

// ---------------------------------------------------------------------------
// مهمة — الخطوة التالية بعد إغلاق آخر مهمة على صفقة
// ---------------------------------------------------------------------------

export async function createTask(input: {
  title: string
  due_at: string
  contact_id?: string
  deal_id?: string
}): Promise<ActionResult> {
  const db = createClient()

  if (!input.title.trim()) return { ok: false, error: 'اكتب عنوان المهمة.' }
  if (!input.due_at) return { ok: false, error: 'حدّد وقتاً للمهمة.' }

  const staff = await currentStaffId(db)

  const { data, error } = await db.from('tasks').insert({
    title: input.title.trim(),
    due_at: input.due_at,
    contact_id: input.contact_id || null,
    deal_id: input.deal_id || null,
    assigned_to: staff,
  }).select('id').single()

  if (error) return { ok: false, error: FAILED }

  revalidatePath('/')
  return { ok: true, id: data.id }
}

/** إنهاء مهمة من شاشة اليوم */
export async function completeTask(taskId: string): Promise<ActionResult> {
  const db = createClient()

  const { error } = await db.from('tasks').update({ status: 'done' }).eq('id', taskId)
  if (error) return { ok: false, error: FAILED }

  revalidatePath('/')
  return { ok: true }
}
