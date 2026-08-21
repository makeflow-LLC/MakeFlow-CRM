'use server'

/**
 * إدارة الفريق.
 *
 * الفرق بين هذا الملف و lib/actions.ts أنّ ما هنا يمسّ حسابات الدخول نفسها،
 * لا بيانات العمل. ولذلك قاعدتان ثابتتان:
 *
 *   1. كل إجراء يبدأ بـ requireAdmin، فلا يكفي أن يكون المنادي مسجَّل دخول.
 *   2. الكتابة تمرّ بعميل الإدارة، لأن جدول users لا يقبل الكتابة من جلسة
 *      موظف عادي أصلاً (0003_team أزال سياسات الكتابة عليه). لولا ذلك
 *      لاستطاع موظف مبيعات أن يرفّع نفسه إلى مدير باستدعاء واحد.
 *
 * كل دالة تُعيد { ok, error } برسالة عربية جاهزة للعرض.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, hasAdminKey } from '@/lib/supabase/admin'
import { normalizePhone } from '@/lib/utils'
import { isE164 } from '@/lib/phone'
import type { Role } from '@/lib/types'

export interface TeamResult {
  ok: boolean
  error?: string
  id?: string
}

export interface TeamMember {
  id: string
  auth_user_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  role: Role
  avatar_color: string
  active: boolean
  created_at: string
  /** آخر دخول — يحتاج مفتاح الإدارة، وقد يكون null إن لم يدخل بعد */
  last_sign_in_at: string | null
}

export interface TeamView {
  members: TeamMember[]
  /** معرّف صف الموظف الذي يتصفّح الآن */
  viewerId: string | null
  viewerRole: Role | null
  /** المدير وحده يرى أدوات الإضافة والتعطيل */
  isAdmin: boolean
  /** مفتاح الإدارة مضبوط على الخادم؟ بدونه لا تُنشأ حسابات ولا تُغيَّر كلمات المرور */
  canManageAccounts: boolean
  /** وضع المعاينة — لا قاعدة بيانات متصلة */
  demo: boolean
}

const FAILED = 'لم يتم الحفظ. أعد المحاولة، فإن تكرّر الأمر فأبلغنا به.'
const NO_KEY =
  'مفتاح الإدارة غير مضبوط على الخادم، ولا يمكن إنشاء حسابات أو تغيير كلمات المرور بدونه.'
const NOT_ADMIN = 'هذا الإجراء متاح للمدير وحده.'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function isLiveMode(): Promise<boolean> {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

// ---------------------------------------------------------------------------
// من ينادي؟
// ---------------------------------------------------------------------------

interface Viewer {
  id: string
  role: Role
  active: boolean
  auth_user_id: string
  full_name: string
  avatar_color: string
}

async function currentViewer(): Promise<Viewer | null> {
  if (!(await isLiveMode())) return null

  const db = createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null

  const { data } = await db
    .from('users')
    .select('id, role, active, auth_user_id, full_name, avatar_color')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  return (data as Viewer) ?? null
}

/** المنادي مديرٌ فعّال، وإلا فلا. */
async function requireAdmin(): Promise<Viewer | null> {
  const viewer = await currentViewer()
  if (!viewer || !viewer.active || viewer.role !== 'admin') return null
  return viewer
}

/**
 * حالة المتصفّح الحالي، لتعرضها الواجهة قبل أي شاشة.
 *
 * منذ 0003_team لم تعد الجلسة وحدها تكفي: من لا صفَّ موظفٍ له، أو صفُّه
 * معطَّل، تمنعه سياسات RLS من قراءة أي شيء. بلا هذا الفحص يرى تطبيقاً
 * فارغاً يظنّه عطلاً، فنُخبره بالسبب صراحةً.
 */
export async function viewerStatus(): Promise<{
  signedIn: boolean
  linked: boolean
  active: boolean
  /** اسم من يعمل الآن ولونه — لأفاتار الشريط العلوي */
  name: string | null
  color: string
}> {
  const blank = { signedIn: false, linked: true, active: true, name: null, color: '#5B4CE0' }
  if (!(await isLiveMode())) return blank

  const db = createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return blank

  const viewer = await currentViewer()
  return {
    signedIn: true,
    linked: Boolean(viewer),
    active: Boolean(viewer?.active),
    name: viewer?.full_name ?? null,
    color: viewer?.avatar_color ?? '#5B4CE0',
  }
}

// ---------------------------------------------------------------------------
// القراءة
// ---------------------------------------------------------------------------

export async function getTeam(): Promise<TeamView> {
  const demo = !(await isLiveMode())

  if (demo) {
    const mock = await import('@/lib/data/mock')
    return {
      members: mock.users.map((u) => ({
        ...u,
        auth_user_id: null,
        email: null,
        created_at: new Date().toISOString(),
        last_sign_in_at: null,
      })),
      viewerId: null,
      viewerRole: null,
      isAdmin: false,
      canManageAccounts: false,
      demo: true,
    }
  }

  const db = createClient()
  const viewer = await currentViewer()

  const { data } = await db
    .from('users')
    .select('id, auth_user_id, full_name, email, phone, role, avatar_color, active, created_at')
    .order('created_at')

  const members: TeamMember[] = (data ?? []).map((u) => ({
    ...(u as Omit<TeamMember, 'last_sign_in_at'>),
    last_sign_in_at: null,
  }))

  // آخر دخول لا يُقرأ إلا بمفتاح الإدارة. غيابه لا يعطّل الشاشة، فنكتفي بما لدينا.
  if (hasAdminKey() && members.length > 0) {
    try {
      const admin = createAdminClient()
      const { data: page } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
      const signIn = new Map(
        (page?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]),
      )
      members.forEach((m) => {
        if (m.auth_user_id) m.last_sign_in_at = signIn.get(m.auth_user_id) ?? null
      })
    } catch {
      // نتركها null — بيانات إضافية لا شرط لعمل الشاشة
    }
  }

  return {
    members,
    viewerId: viewer?.id ?? null,
    viewerRole: viewer?.role ?? null,
    isAdmin: Boolean(viewer && viewer.active && viewer.role === 'admin'),
    canManageAccounts: hasAdminKey(),
    demo: false,
  }
}

// ---------------------------------------------------------------------------
// إضافة عضو — حساب دخول + صف موظف، معاً أو لا شيء
// ---------------------------------------------------------------------------

export async function createTeamMember(input: {
  full_name: string
  email: string
  password: string
  role: Role
  phone?: string
  avatar_color?: string
}): Promise<TeamResult> {
  const admin_viewer = await requireAdmin()
  if (!admin_viewer) return { ok: false, error: NOT_ADMIN }
  if (!hasAdminKey()) return { ok: false, error: NO_KEY }

  const full_name = input.full_name.trim()
  const email = input.email.trim().toLowerCase()

  if (!full_name) return { ok: false, error: 'أدخل اسم العضو.' }
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'أدخل بريداً إلكترونياً صحيحاً.' }
  if (input.password.length < 8) {
    return { ok: false, error: 'كلمة المرور يجب ألّا تقلّ عن ثمانية أحرف.' }
  }
  if (!['admin', 'sales', 'operator'].includes(input.role)) {
    return { ok: false, error: 'اختر دور العضو.' }
  }

  const phone = input.phone?.trim() ? normalizePhone(input.phone) : null
  if (phone && !isE164(phone)) {
    return { ok: false, error: 'أدخل الرقم بمقدّمة بلده، مثل ‎+970599123456‎' }
  }

  const admin = createAdminClient()

  const { data: taken } = await admin
    .from('users').select('id, full_name').ilike('email', email).maybeSingle()
  if (taken) {
    return { ok: false, error: `هذا البريد مستعمل مسبقاً باسم ${taken.full_name}.` }
  }

  // 1) حساب الدخول. email_confirm يجعله جاهزاً للاستعمال فوراً بلا رسالة تفعيل.
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  })

  if (authError || !created?.user) {
    const m = (authError?.message ?? '').toLowerCase()
    if (m.includes('already') || m.includes('registered') || m.includes('exists')) {
      return { ok: false, error: 'يوجد حساب بهذا البريد مسبقاً.' }
    }
    if (m.includes('password')) {
      return { ok: false, error: 'كلمة المرور ضعيفة أو مرفوضة. اختر كلمة أطول وأقوى.' }
    }
    return { ok: false, error: authError?.message || FAILED }
  }

  // 2) صف الموظف. لولاه لدخل الشخص إلى تطبيق فارغ لا يقرأ منه شيئاً.
  const { data: row, error: rowError } = await admin.from('users').insert({
    auth_user_id: created.user.id,
    full_name,
    email,
    phone,
    role: input.role,
    avatar_color: input.avatar_color || '#5B4CE0',
    active: true,
  }).select('id').single()

  if (rowError || !row) {
    // تراجُع: حسابُ دخولٍ بلا صف موظف أسوأ من لا شيء، فنحذفه.
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {})
    return { ok: false, error: FAILED }
  }

  revalidatePath('/team')
  return { ok: true, id: row.id }
}

// ---------------------------------------------------------------------------
// تعديل البيانات
// ---------------------------------------------------------------------------

export async function updateTeamMember(
  id: string,
  input: { full_name?: string; phone?: string | null; role?: Role; avatar_color?: string },
): Promise<TeamResult> {
  const viewer = await requireAdmin()
  if (!viewer) return { ok: false, error: NOT_ADMIN }
  if (!hasAdminKey()) return { ok: false, error: NO_KEY }

  const admin = createAdminClient()
  const patch: Record<string, unknown> = {}

  if (input.full_name !== undefined) {
    if (!input.full_name.trim()) return { ok: false, error: 'أدخل اسم العضو.' }
    patch.full_name = input.full_name.trim()
  }

  if (input.phone !== undefined) {
    const phone = input.phone?.trim() ? normalizePhone(input.phone) : null
    if (phone && !isE164(phone)) {
      return { ok: false, error: 'أدخل الرقم بمقدّمة بلده، مثل ‎+970599123456‎' }
    }
    patch.phone = phone
  }

  if (input.avatar_color !== undefined) patch.avatar_color = input.avatar_color

  if (input.role !== undefined) {
    const guard = await lastAdminGuard(admin, id, { role: input.role })
    if (guard) return { ok: false, error: guard }
    patch.role = input.role
  }

  if (Object.keys(patch).length === 0) return { ok: true }

  const { error } = await admin.from('users').update(patch).eq('id', id)
  if (error) {
    return { ok: false, error: error.message.toLowerCase().includes('avatar_color')
      ? 'اللون غير صالح.'
      : FAILED }
  }

  revalidatePath('/team')
  revalidatePath('/')
  revalidatePath('/deals')
  revalidatePath('/contacts')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// تعطيل / إعادة تفعيل
// ---------------------------------------------------------------------------

/**
 * التعطيل يعمل على طبقتين: صف الموظف يصير active = false فتمنعه سياسات RLS
 * من قراءة أي بيان، وحساب الدخول يُحظر فلا يستطيع تسجيل الدخول أصلاً.
 * الاكتفاء بواحدة منهما يترك باباً مفتوحاً.
 */
export async function setMemberActive(id: string, active: boolean): Promise<TeamResult> {
  const viewer = await requireAdmin()
  if (!viewer) return { ok: false, error: NOT_ADMIN }
  if (!hasAdminKey()) return { ok: false, error: NO_KEY }

  if (id === viewer.id && !active) {
    return { ok: false, error: 'لا يمكنك تعطيل حسابك أنت. اطلب من مديرٍ آخر فعل ذلك.' }
  }

  const admin = createAdminClient()

  if (!active) {
    const guard = await lastAdminGuard(admin, id, { active: false })
    if (guard) return { ok: false, error: guard }
  }

  const { data: member } = await admin
    .from('users').select('auth_user_id, full_name').eq('id', id).maybeSingle()
  if (!member) return { ok: false, error: 'لم نعثر على العضو.' }

  const { error } = await admin.from('users').update({ active }).eq('id', id)
  if (error) return { ok: false, error: FAILED }

  if (member.auth_user_id) {
    await admin.auth.admin.updateUserById(member.auth_user_id, {
      ban_duration: active ? 'none' : '876000h', // مئة عام ≈ حظر دائم
    }).catch(() => {})
  }

  revalidatePath('/team')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// كلمات المرور
// ---------------------------------------------------------------------------

/** المدير يضبط كلمة مرور عضو نسيها. */
export async function resetMemberPassword(id: string, password: string): Promise<TeamResult> {
  const viewer = await requireAdmin()
  if (!viewer) return { ok: false, error: NOT_ADMIN }
  if (!hasAdminKey()) return { ok: false, error: NO_KEY }
  if (password.length < 8) {
    return { ok: false, error: 'كلمة المرور يجب ألّا تقلّ عن ثمانية أحرف.' }
  }

  const admin = createAdminClient()
  const { data: member } = await admin
    .from('users').select('auth_user_id').eq('id', id).maybeSingle()

  if (!member?.auth_user_id) {
    return { ok: false, error: 'هذا العضو بلا حساب دخول مرتبط.' }
  }

  const { error } = await admin.auth.admin.updateUserById(member.auth_user_id, { password })
  if (error) {
    return { ok: false, error: error.message.toLowerCase().includes('password')
      ? 'كلمة المرور مرفوضة. اختر كلمة أطول وأقوى.'
      : FAILED }
  }

  revalidatePath('/team')
  return { ok: true }
}

/**
 * كلمة مرور المستخدم نفسه — بجلسته هو، بلا مفتاح إدارة ولا صلاحية مدير.
 * هذا هو الطريق الذي يغيّر به كلٌّ من الثلاثة كلمته الأولى.
 */
export async function changeOwnPassword(password: string): Promise<TeamResult> {
  const viewer = await currentViewer()
  if (!viewer) return { ok: false, error: 'انتهت جلستك. سجّل الدخول مرة أخرى.' }
  if (password.length < 8) {
    return { ok: false, error: 'كلمة المرور يجب ألّا تقلّ عن ثمانية أحرف.' }
  }

  const db = createClient()
  const { error } = await db.auth.updateUser({ password })

  if (error) {
    const m = error.message.toLowerCase()
    if (m.includes('should be different') || m.includes('same as')) {
      return { ok: false, error: 'كلمة المرور الجديدة مطابقة للقديمة.' }
    }
    if (m.includes('password') || m.includes('pwned') || m.includes('weak')) {
      return { ok: false, error: 'كلمة المرور ضعيفة أو معروفة التسريب. اختر كلمة أخرى.' }
    }
    return { ok: false, error: FAILED }
  }

  return { ok: true }
}

// ---------------------------------------------------------------------------
// الحذف — آخر الخيارات
// ---------------------------------------------------------------------------

/** ما الذي سيفقد صاحبَه إن حُذف هذا العضو؟ */
export async function memberDeletionImpact(id: string): Promise<{
  full_name: string
  owned: number
  isSelf: boolean
} | null> {
  const viewer = await requireAdmin()
  if (!viewer || !hasAdminKey()) return null

  const admin = createAdminClient()
  const { data: member } = await admin
    .from('users').select('full_name').eq('id', id).maybeSingle()
  if (!member) return null

  const counts = await Promise.all([
    admin.from('contacts').select('id', { count: 'exact', head: true }).eq('owner_id', id),
    admin.from('organizations').select('id', { count: 'exact', head: true }).eq('owner_id', id),
    admin.from('deals').select('id', { count: 'exact', head: true }).eq('owner_id', id),
    admin.from('subscriptions').select('id', { count: 'exact', head: true }).eq('owner_id', id),
    admin.from('tasks').select('id', { count: 'exact', head: true }).eq('assigned_to', id),
    admin.from('activities').select('id', { count: 'exact', head: true }).eq('created_by', id),
  ])

  return {
    full_name: member.full_name,
    owned: counts.reduce((sum, c) => sum + (c.count ?? 0), 0),
    isSelf: id === viewer.id,
  }
}

/**
 * لا يُحذف عضو له سجلّات: الحذف يقطع نسبة العمل إلى صاحبه فتصبح الصفقات
 * والمهام بلا مسؤول. البديل المعروض هو التعطيل — يمنع الدخول ويُبقي التاريخ.
 */
export async function deleteTeamMember(id: string): Promise<TeamResult> {
  const viewer = await requireAdmin()
  if (!viewer) return { ok: false, error: NOT_ADMIN }
  if (!hasAdminKey()) return { ok: false, error: NO_KEY }

  if (id === viewer.id) {
    return { ok: false, error: 'لا يمكنك حذف حسابك أنت.' }
  }

  const admin = createAdminClient()

  const guard = await lastAdminGuard(admin, id, { active: false })
  if (guard) return { ok: false, error: guard }

  const impact = await memberDeletionImpact(id)
  if (impact && impact.owned > 0) {
    return {
      ok: false,
      error: `${impact.full_name} مسؤول عن ${impact.owned} سجلاً. عطّل حسابه بدل حذفه: التعطيل يمنع الدخول ويُبقي نسبة العمل إليه.`,
    }
  }

  const { data: member } = await admin
    .from('users').select('auth_user_id').eq('id', id).maybeSingle()

  const { error } = await admin.from('users').delete().eq('id', id)
  if (error) return { ok: false, error: FAILED }

  if (member?.auth_user_id) {
    await admin.auth.admin.deleteUser(member.auth_user_id).catch(() => {})
  }

  revalidatePath('/team')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// حارس المدير الأخير
// ---------------------------------------------------------------------------

/**
 * تعطيل آخر مدير فعّال أو خفض دوره يقفل النظام على الجميع: لا أحد يبقى
 * قادراً على إعادة تفعيله من داخل التطبيق. نمنع ذلك ونشرح السبب.
 * تُعيد نصّ الخطأ عند المنع، أو null إن كان الإجراء آمناً.
 */
async function lastAdminGuard(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  next: { role?: Role; active?: boolean },
): Promise<string | null> {
  const staysAdmin = next.role === undefined ? true : next.role === 'admin'
  const staysActive = next.active === undefined ? true : next.active
  if (staysAdmin && staysActive) return null

  const { data: admins } = await admin
    .from('users').select('id').eq('role', 'admin').eq('active', true)

  const others = (admins ?? []).filter((a) => a.id !== id)
  if (others.length > 0) return null

  const { data: target } = await admin
    .from('users').select('role, active').eq('id', id).maybeSingle()

  if (!target || target.role !== 'admin' || !target.active) return null

  return 'هذا هو المدير الفعّال الوحيد. عيّن مديراً آخر أولاً، وإلا بقي النظام بلا من يديره.'
}
