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
import { isE164 } from '@/lib/phone'
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
    return 'صيغة رقم الهاتف غير صحيحة. اختر مقدّمة البلد ثم اكتب الرقم كاملاً.'
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
  if (!isE164(phone)) {
    return { ok: false, error: 'أدخل الرقم بمقدّمة بلده، مثل ‎+970599123456‎' }
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

/**
 * حذف جهة اتصال.
 *
 * هذا أثقل حذف في النظام: الشخص جذرُ كل ما بُني عليه، فحذفه يجرّ صفقاته
 * ومدفوعاتها وأنشطته ومهامه دفعةً واحدة. لذلك نسأل الخادم أولاً عن حجم ما
 * سيُفقد ونعرضه بالرقم قبل أي تأكيد، ونشدّد التحذير إن كان عليه مبلغ مسدَّد.
 *
 * الاشتراكات استثناء: تُفكّ عن الشخص ولا تُحذف، لأنها غالباً مرتبطة بجهة
 * تستمرّ بعد رحيل من كان يمثّلها. لكن اشتراكاً باسم الشخص وحده لا جهة له لا
 * يمكن فكّه — قاعدة البيانات تشترط لكل اشتراك صاحباً — فوجودُه يمنع الحذف،
 * ونقولها قبل الضغط لا بعده.
 */
export async function contactDeletionImpact(contactId: string): Promise<{
  fullName: string
  deals: number
  payments: number
  paidTotal: number
  activities: number
  tasks: number
  subscriptions: number
  /** اشتراكات لا جهة لها — تمنع الحذف */
  personalSubscriptions: number
} | null> {
  const db = createClient()

  const { data: contact } = await db
    .from('contacts').select('id, full_name').eq('id', contactId).maybeSingle()
  if (!contact) return null

  const { data: deals } = await db.from('deals').select('id').eq('contact_id', contactId)
  const dealIds = (deals ?? []).map((d) => d.id)

  const [{ data: payments }, { count: activities }, { count: tasks }, { data: subs }] =
    await Promise.all([
      dealIds.length
        ? db.from('payments').select('amount, status').in('deal_id', dealIds)
        : Promise.resolve({ data: [] as { amount: number; status: string }[] }),
      db.from('activities').select('id', { count: 'exact', head: true }).eq('contact_id', contactId),
      db.from('tasks').select('id', { count: 'exact', head: true }).eq('contact_id', contactId),
      db.from('subscriptions').select('id, organization_id').eq('contact_id', contactId),
    ])

  return {
    fullName: contact.full_name,
    deals: dealIds.length,
    payments: payments?.length ?? 0,
    paidTotal: (payments ?? [])
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0),
    activities: activities ?? 0,
    tasks: tasks ?? 0,
    subscriptions: subs?.length ?? 0,
    personalSubscriptions: (subs ?? []).filter((s) => !s.organization_id).length,
  }
}

export async function deleteContact(contactId: string): Promise<ActionResult> {
  const db = createClient()

  // اشتراك باسم الشخص وحده يجعل الحذف يفشل في قاعدة البيانات برسالة غامضة،
  // فنسبقها برسالة تقول ما العمل.
  const { data: personal } = await db
    .from('subscriptions').select('id').eq('contact_id', contactId).is('organization_id', null)

  if ((personal?.length ?? 0) > 0) {
    return {
      ok: false,
      error: 'لهذا الشخص اشتراك باسمه لا جهة له. انقل الاشتراك إلى جهة أو أنهِه أولاً، ثم احذفه.',
    }
  }

  const { error } = await db.from('contacts').delete().eq('id', contactId)
  if (error) return { ok: false, error: readableError(error.message, 'contact') }

  revalidatePath('/contacts')
  revalidatePath('/deals')
  revalidatePath('/payments')
  revalidatePath('/subscriptions')
  revalidatePath('/organizations')
  revalidatePath('/')
  return { ok: true }
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

/**
 * حذف صفقة.
 *
 * الحذف يجرّ معه مدفوعات الصفقة ومهامها (قيود cascade في قاعدة البيانات)،
 * لذا نُرجع للواجهة ما سيُفقد قبل التأكيد، ونمنع الحذف الصامت لسجلّ مالي.
 */
export async function dealDeletionImpact(dealId: string): Promise<{
  title: string
  contactName: string
  payments: number
  paidTotal: number
  tasks: number
} | null> {
  const db = createClient()

  const { data: deal } = await db
    .from('deals').select('id, title, contact_id').eq('id', dealId).maybeSingle()
  if (!deal) return null

  const [{ data: contact }, { data: payments }, { count: tasks }] = await Promise.all([
    db.from('contacts').select('full_name').eq('id', deal.contact_id).maybeSingle(),
    db.from('payments').select('amount, status').eq('deal_id', dealId),
    db.from('tasks').select('id', { count: 'exact', head: true }).eq('deal_id', dealId),
  ])

  return {
    title: deal.title,
    contactName: contact?.full_name ?? '',
    payments: payments?.length ?? 0,
    paidTotal: (payments ?? [])
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0),
    tasks: tasks ?? 0,
  }
}

export async function deleteDeal(dealId: string): Promise<ActionResult> {
  const db = createClient()

  const { data: deal } = await db
    .from('deals').select('contact_id').eq('id', dealId).maybeSingle()

  const { error } = await db.from('deals').delete().eq('id', dealId)
  if (error) return { ok: false, error: readableError(error.message, 'deal') }

  revalidatePath('/deals')
  revalidatePath('/')
  revalidatePath('/payments')
  if (deal?.contact_id) revalidatePath(`/contacts/${deal.contact_id}`)
  return { ok: true }
}

/**
 * فتح صفقات دفعةً واحدة بعد استيراد ملف.
 *
 * تُستدعى بعد حفظ الأشخاص، فتتلقّى أزواج (شخص، منتج) وتستنتج لكل زوج مساره
 * ومرحلته الأولى — وهو المنطق نفسه في createDeal، لكن مقروءاً مرة واحدة
 * لكل الملف بدل استعلامٍ لكل صف. ثمانمئة صف تعني ثمانمئة رحلة إلى الخادم
 * لو فُعلت واحدةً واحدة.
 *
 * ولا تفشل الدفعة كلها بفشل صف: نُبلغ بعدد ما نجح وما تعذّر.
 */
export async function createDealsForImport(
  pairs: {
    contact_id: string
    product_id: string
    /** المرحلة المطلوبة، أو غيابها فتبدأ الصفقة من أول مرحلة */
    stage_id?: string | null
    lost_reason?: string | null
    /** دفعة مؤكَّدة تُسجَّل على الصفقة فور إنشائها */
    paid_amount?: number | null
  }[],
): Promise<{ ok: boolean; created: number; failed: number; error?: string }> {
  const db = createClient()
  if (!pairs.length) return { ok: true, created: 0, failed: 0 }

  const [{ data: contacts }, { data: products }, { data: pipelines }, { data: stages }] =
    await Promise.all([
      db.from('contacts').select('id, full_name, organization_id, owner_id')
        .in('id', Array.from(new Set(pairs.map((p) => p.contact_id)))),
      db.from('products').select('id, name, kind, default_price, currency')
        .in('id', Array.from(new Set(pairs.map((p) => p.product_id)))),
      db.from('pipelines').select('id, product_kind'),
      db.from('pipeline_stages').select('id, pipeline_id, sort_order, is_won, is_lost')
        .order('sort_order'),
    ])

  const contactById = new Map((contacts ?? []).map((c) => [c.id, c]))
  const productById = new Map((products ?? []).map((p) => [p.id, p]))
  const owner = await currentStaffId(db)

  const rows: Record<string, unknown>[] = []
  const paidBy: (number | null)[] = []
  let failed = 0

  for (const pair of pairs) {
    const contact = contactById.get(pair.contact_id)
    const product = productById.get(pair.product_id)
    if (!contact || !product) { failed++; continue }

    // المسار يتبع نوع المنتج، والخدمات تشارك الشركات لوحتها
    const pipeline =
      pipelines?.find((p) => p.product_kind === product.kind) ??
      pipelines?.find((p) => p.product_kind === 'subscription')
    if (!pipeline) { failed++; continue }

    const inPipeline = (stages ?? []).filter((s) => s.pipeline_id === pipeline.id)
    const firstStage = inPipeline
      .filter((s) => !s.is_won && !s.is_lost)
      .sort((a, b) => a.sort_order - b.sort_order)[0]

    // المرحلة المطلوبة يجب أن تكون من مسار هذا المنتج، وإلا رفضتها قاعدة
    // البيانات (قاعدة STAGE_PIPELINE_MISMATCH) وسقطت الدفعة كلها
    const wanted = pair.stage_id
      ? inPipeline.find((s) => s.id === pair.stage_id) ?? null
      : null

    const stage = wanted ?? firstStage
    if (!stage) { failed++; continue }

    rows.push({
      title: `${contact.full_name} — ${product.name}`,
      contact_id: contact.id,
      organization_id: contact.organization_id,
      product_id: product.id,
      pipeline_id: pipeline.id,
      stage_id: stage.id,
      value: product.default_price ?? 0,
      currency: product.currency,
      owner_id: contact.owner_id ?? owner,
      lost_reason: stage.is_lost ? pair.lost_reason?.trim() || null : null,
    })
    paidBy.push(pair.paid_amount ?? null)
  }

  if (!rows.length) return { ok: false, created: 0, failed, error: FAILED }

  const { data: created, error } = await db.from('deals').insert(rows).select('id')
  if (error) return { ok: false, created: 0, failed: pairs.length, error: readableError(error.message, 'deal') }

  /**
   * الدفعات بعد الصفقات مباشرة. بدونها تظهر ثمانمئة صفقة قديمة في
   * «بِعته ولم تقبضه» وكأن المال لم يصل — وهو وصل قبل شهور.
   */
  const payments = (created ?? [])
    .map((deal, i) => ({ deal, amount: paidBy[i] }))
    .filter((x) => x.amount && x.amount > 0)
    .map((x) => ({
      deal_id: x.deal.id,
      amount: x.amount as number,
      method: 'other' as const,
      status: 'paid' as const,
      paid_at: new Date().toISOString(),
      verified_by: owner,
      note: 'مستورد من ملف',
    }))

  if (payments.length) await db.from('payments').insert(payments)

  revalidatePath('/deals')
  revalidatePath('/contacts')
  revalidatePath('/payments')
  revalidatePath('/reports')
  revalidatePath('/')
  return { ok: true, created: rows.length, failed }
}

// ---------------------------------------------------------------------------
// المنتجات
// ---------------------------------------------------------------------------

export async function createProduct(input: {
  name: string
  kind: 'course' | 'subscription' | 'service'
  default_price?: number
  color?: string
}): Promise<ActionResult> {
  const db = createClient()

  if (!input.name.trim()) return { ok: false, error: 'أدخل اسم المنتج.' }

  const { data, error } = await db.from('products').insert({
    name: input.name.trim(),
    kind: input.kind,
    default_price: input.default_price ?? null,
    color: input.color || '#5B4CE0',
    active: true,
  }).select('id').single()

  if (error) {
    const m = error.message.toLowerCase()
    if (m.includes('duplicate') || m.includes('unique')) {
      return { ok: false, error: 'يوجد منتج بهذا الاسم مسبقاً.' }
    }
    return { ok: false, error: FAILED }
  }

  revalidatePath('/products')
  revalidatePath('/deals')
  return { ok: true, id: data.id }
}

export async function updateProduct(
  id: string,
  input: { name?: string; default_price?: number | null; color?: string; active?: boolean },
): Promise<ActionResult> {
  const db = createClient()

  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) {
    if (!input.name.trim()) return { ok: false, error: 'أدخل اسم المنتج.' }
    patch.name = input.name.trim()
  }
  if (input.default_price !== undefined) patch.default_price = input.default_price
  if (input.color !== undefined) patch.color = input.color
  if (input.active !== undefined) patch.active = input.active

  const { error } = await db.from('products').update(patch).eq('id', id)
  if (error) return { ok: false, error: FAILED }

  revalidatePath('/products')
  revalidatePath('/deals')
  revalidatePath('/subscriptions')
  return { ok: true }
}

/**
 * لا يُحذف منتج له صفقات أو اشتراكات: حذفه يمحو تاريخاً مالياً.
 * البديل المعروض هو الإيقاف — يختفي من قوائم الاختيار ويبقى ما بُني عليه.
 */
export async function deleteProduct(id: string): Promise<ActionResult> {
  const db = createClient()

  const [{ count: deals }, { count: subs }] = await Promise.all([
    db.from('deals').select('id', { count: 'exact', head: true }).eq('product_id', id),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('product_id', id),
  ])

  if ((deals ?? 0) > 0 || (subs ?? 0) > 0) {
    return {
      ok: false,
      error: `لا يمكن حذف منتج مرتبط بـ ${(deals ?? 0) + (subs ?? 0)} سجلاً. أوقفه بدل حذفه ليختفي من قوائم الاختيار مع بقاء تاريخه.`,
    }
  }

  const { error } = await db.from('products').delete().eq('id', id)
  if (error) return { ok: false, error: FAILED }

  revalidatePath('/products')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// دفعة
// ---------------------------------------------------------------------------

/**
 * تسجيل دفعة على صفقة.
 *
 * نقل البطاقة إلى مرحلة «دفع» لا ينشئ دفعة — المرحلة موقعٌ على المسار،
 * والدفعة سجلّ مالي له مبلغ وطريقة وتاريخ. هما شيئان مختلفان، والخلط
 * بينهما يجعل التقارير تقول صفراً بينما المال وصل فعلاً.
 *
 * والاتجاه واحد: الدفعة المؤكَّدة هي التي تدفع الصفقة إلى الأمام (قاعدة
 * في قاعدة البيانات)، لا العكس.
 */
export async function createPayment(input: {
  deal_id: string
  amount: number
  method?: 'bank_transfer' | 'cash' | 'wallet' | 'other'
  status?: 'paid' | 'needs_checking' | 'not_paid'
  paid_at?: string
  note?: string
}): Promise<ActionResult> {
  const db = createClient()

  if (!input.deal_id) return { ok: false, error: 'اختر الصفقة التي وصلك مقابلها المبلغ.' }
  if (!(input.amount > 0)) return { ok: false, error: 'أدخل المبلغ بالأرقام.' }

  const { data: deal } = await db
    .from('deals').select('id, currency, contact_id').eq('id', input.deal_id).maybeSingle()
  if (!deal) return { ok: false, error: 'لم نعثر على الصفقة.' }

  const status = input.status ?? 'paid'
  const staff = await currentStaffId(db)

  const { data, error } = await db.from('payments').insert({
    deal_id: deal.id,
    amount: input.amount,
    currency: deal.currency,
    method: input.method ?? 'bank_transfer',
    status,
    // المؤكَّدة يلزمها تاريخ، وإلا ظهرت في التقارير بلا زمن
    paid_at: status === 'paid' ? (input.paid_at || new Date().toISOString()) : null,
    verified_by: status === 'paid' ? staff : null,
    note: input.note?.trim() || null,
  }).select('id').single()

  if (error) return { ok: false, error: readableError(error.message, 'deal') }

  revalidatePath('/payments')
  revalidatePath('/deals')
  revalidatePath('/reports')
  revalidatePath('/')
  if (deal.contact_id) revalidatePath(`/contacts/${deal.contact_id}`)
  return { ok: true, id: data.id }
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
