/**
 * بيانات تجريبية للمعاينة.
 *
 * تعمل بس لما ما يكون في مفاتيح Supabase — حتى تقدر تفتح التطبيق وتشوفه
 * بدون أي إعداد. نفس المنتجات والمراحل والألوان الموجودة بـ 0002_seed.sql،
 * والتواريخ محسوبة نسبة لليوم حتى الشاشات تضل حيّة.
 */

import type {
  Activity, Contact, Deal, Organization, Payment, Pipeline,
  Product, Stage, Subscription, Task, User,
} from '@/lib/types'

const now = Date.now()
const hours = (h: number) => new Date(now - h * 3600_000).toISOString()
const days = (d: number) => new Date(now - d * 86400_000).toISOString()
const inDays = (d: number) => new Date(now + d * 86400_000).toISOString()
const dateIn = (d: number) => new Date(now + d * 86400_000).toISOString().slice(0, 10)

export const users: User[] = [
  { id: 'u1', full_name: 'المدير', phone: '+970590000001', role: 'admin', avatar_color: '#5B4CE0', active: true },
  { id: 'u2', full_name: 'منسّق المبيعات', phone: '+970590000002', role: 'sales', avatar_color: '#3B9BE8', active: true },
  { id: 'u3', full_name: 'المشغّل', phone: '+970590000003', role: 'operator', avatar_color: '#0EA47A', active: true },
]

export const products: Product[] = [
  { id: 'p1', name: 'دورة الأتمتة بالذكاء الاصطناعي (n8n)', kind: 'course', default_price: 250, currency: 'ILS', color: '#7B61FF', active: true },
  { id: 'p2', name: 'دورة الذكاء الاصطناعي للأعمال', kind: 'course', default_price: 250, currency: 'ILS', color: '#3B9BE8', active: true },
  { id: 'p3', name: 'دورة صناعة المحتوى بالذكاء الاصطناعي', kind: 'course', default_price: 200, currency: 'ILS', color: '#F5A623', active: true },
  { id: 'p4', name: 'Mojeeb', kind: 'subscription', default_price: 150, currency: 'ILS', color: '#22C55E', active: true },
  { id: 'p5', name: 'SmartClinic', kind: 'subscription', default_price: 250, currency: 'ILS', color: '#0EA47A', active: true },
  { id: 'p6', name: 'SmartSalon', kind: 'subscription', default_price: 150, currency: 'ILS', color: '#E8639B', active: true },
  { id: 'p7', name: 'Imagen', kind: 'service', default_price: 500, currency: 'ILS', color: '#5B4CE0', active: true },
]

export const pipelines: Pipeline[] = [
  { id: 'pl1', name: 'الأكاديمية', product_kind: 'course' },
  { id: 'pl2', name: 'مجيب وسمارت كلينيك', product_kind: 'subscription' },
]

export const stages: Stage[] = [
  { id: 's1', pipeline_id: 'pl1', name: 'جديد', sort_order: 1, color: '#9AA4B2', is_won: false, is_lost: false, is_paid_stage: false },
  { id: 's2', pipeline_id: 'pl1', name: 'تواصل مع البوت', sort_order: 2, color: '#3B9BE8', is_won: false, is_lost: false, is_paid_stage: false },
  { id: 's3', pipeline_id: 'pl1', name: 'وافق على التسجيل', sort_order: 3, color: '#7B61FF', is_won: false, is_lost: false, is_paid_stage: false },
  { id: 's4', pipeline_id: 'pl1', name: 'بانتظار الدفع', sort_order: 4, color: '#F5A623', is_won: false, is_lost: false, is_paid_stage: false },
  { id: 's5', pipeline_id: 'pl1', name: 'دفع', sort_order: 5, color: '#22C55E', is_won: false, is_lost: false, is_paid_stage: true },
  { id: 's6', pipeline_id: 'pl1', name: 'حضر', sort_order: 6, color: '#0EA47A', is_won: true, is_lost: false, is_paid_stage: false },
  { id: 's7', pipeline_id: 'pl1', name: 'خسرناه', sort_order: 7, color: '#E5484D', is_won: false, is_lost: true, is_paid_stage: false },

  { id: 't1', pipeline_id: 'pl2', name: 'جديد', sort_order: 1, color: '#9AA4B2', is_won: false, is_lost: false, is_paid_stage: false },
  { id: 't2', pipeline_id: 'pl2', name: 'مكالمة تعارف', sort_order: 2, color: '#3B9BE8', is_won: false, is_lost: false, is_paid_stage: false },
  { id: 't3', pipeline_id: 'pl2', name: 'أرسلنا عرض سعر', sort_order: 3, color: '#7B61FF', is_won: false, is_lost: false, is_paid_stage: false },
  { id: 't4', pipeline_id: 'pl2', name: 'تجربة', sort_order: 4, color: '#F5A623', is_won: false, is_lost: false, is_paid_stage: false },
  { id: 't5', pipeline_id: 'pl2', name: 'تعاقد', sort_order: 5, color: '#22C55E', is_won: true, is_lost: false, is_paid_stage: false },
  { id: 't6', pipeline_id: 'pl2', name: 'خسرناه', sort_order: 6, color: '#E5484D', is_won: false, is_lost: true, is_paid_stage: false },
]

export const organizations: Organization[] = [
  { id: 'o1', name: 'عيادة النور', type: 'clinic', sector: 'أسنان', city: 'غزة', website: null, notes: 'أكبر عيادة أسنان في المنطقة، ولديها ثلاثة أطباء.', owner_id: 'u2' },
  { id: 'o2', name: 'صالون لمسة', type: 'salon', sector: 'تجميل', city: 'غزة', website: null, notes: null, owner_id: 'u2' },
  { id: 'o3', name: 'محل الأمل للهواتف', type: 'shop', sector: 'إلكترونيات', city: 'خان يونس', website: null, notes: 'سريعو الاستجابة على واتساب.', owner_id: 'u1' },
  { id: 'o4', name: 'مركز بيان التعليمي', type: 'school', sector: 'تعليم', city: 'غزة', website: null, notes: null, owner_id: 'u2' },
  { id: 'o5', name: 'عيادة الشفاء التخصصية', type: 'clinic', sector: 'جلدية', city: 'رفح', website: null, notes: 'مهتمون بـ SmartClinic، ويطلبون فترة تجربة أولاً.', owner_id: 'u1' },
]

export const contacts: Contact[] = [
  { id: 'c1', full_name: 'أحمد صالح', phone: '+970599123456', email: null, city: 'غزة', preferred_language: 'ar', source: 'whatsapp_bot', source_detail: 'سأل عن دورة n8n', organization_id: null, role_in_org: null, owner_id: 'u2', notes: null, created_at: days(9) },
  { id: 'c2', full_name: 'د. سامي حرب', phone: '+970599234567', email: 'sami@alnoor.ps', city: 'غزة', preferred_language: 'ar', source: 'referral', source_detail: 'صديق زميل', organization_id: 'o1', role_in_org: 'صاحب العيادة', owner_id: 'u2', notes: 'يفضّل المكالمات بعد الساعة السادسة مساءً.', created_at: days(40) },
  { id: 'c3', full_name: 'ليان عبد الله', phone: '+970598111222', email: null, city: 'غزة', preferred_language: 'ar', source: 'facebook_ad', source_detail: 'إعلان دورة المحتوى', organization_id: null, role_in_org: null, owner_id: 'u2', notes: null, created_at: days(4) },
  { id: 'c4', full_name: 'محمد أبو ندى', phone: '+970597333444', email: null, city: 'خان يونس', preferred_language: 'ar', source: 'whatsapp_bot', source_detail: null, organization_id: 'o3', role_in_org: 'صاحب المحل', owner_id: 'u1', notes: null, created_at: days(15) },
  { id: 'c5', full_name: 'رنا مشتهى', phone: '+970599555666', email: null, city: 'غزة', preferred_language: 'ar', source: 'workshop', source_detail: 'ورشة الأتمتة', organization_id: 'o2', role_in_org: 'مديرة الصالون', owner_id: 'u2', notes: null, created_at: days(22) },
  { id: 'c6', full_name: 'د. هبة قنديل', phone: '+970599777888', email: null, city: 'رفح', preferred_language: 'ar', source: 'referral', source_detail: null, organization_id: 'o5', role_in_org: 'طبيبة جلدية', owner_id: 'u1', notes: null, created_at: days(11) },
  { id: 'c7', full_name: 'يوسف الغول', phone: '+970598999000', email: null, city: 'غزة', preferred_language: 'ar', source: 'whatsapp_bot', source_detail: null, organization_id: null, role_in_org: null, owner_id: 'u3', notes: null, created_at: days(6) },
  { id: 'c8', full_name: 'سلمى نجم', phone: '+970597121314', email: null, city: 'غزة', preferred_language: 'ar', source: 'facebook_ad', source_detail: null, organization_id: 'o4', role_in_org: 'منسقة', owner_id: 'u2', notes: null, created_at: days(30) },
  { id: 'c9', full_name: 'خالد شاهين', phone: '+970599151617', email: null, city: 'غزة', preferred_language: 'ar', source: 'whatsapp_bot', source_detail: null, organization_id: null, role_in_org: null, owner_id: 'u2', notes: null, created_at: days(2) },
  { id: 'c10', full_name: 'نور البطة', phone: '+970598181920', email: null, city: 'دير البلح', preferred_language: 'ar', source: 'referral', source_detail: null, organization_id: null, role_in_org: null, owner_id: 'u3', notes: null, created_at: days(18) },
]

export const deals: Deal[] = [
  // --- الأكاديمية ---
  { id: 'd1', title: 'أحمد صالح — دورة الأتمتة بالذكاء الاصطناعي (n8n)', contact_id: 'c1', organization_id: null, product_id: 'p1', pipeline_id: 'pl1', stage_id: 's4', stage_entered_at: hours(74), value: 250, currency: 'ILS', status: 'open', lost_reason: null, expected_close_date: null, owner_id: 'u2', created_at: days(9) },
  { id: 'd2', title: 'ليان عبد الله — دورة صناعة المحتوى بالذكاء الاصطناعي', contact_id: 'c3', organization_id: null, product_id: 'p3', pipeline_id: 'pl1', stage_id: 's2', stage_entered_at: hours(20), value: 200, currency: 'ILS', status: 'open', lost_reason: null, expected_close_date: null, owner_id: 'u2', created_at: days(4) },
  { id: 'd3', title: 'يوسف الغول — دورة الذكاء الاصطناعي للأعمال', contact_id: 'c7', organization_id: null, product_id: 'p2', pipeline_id: 'pl1', stage_id: 's1', stage_entered_at: hours(8), value: 250, currency: 'ILS', status: 'open', lost_reason: null, expected_close_date: null, owner_id: 'u3', created_at: days(6) },
  { id: 'd4', title: 'خالد شاهين — دورة الأتمتة بالذكاء الاصطناعي (n8n)', contact_id: 'c9', organization_id: null, product_id: 'p1', pipeline_id: 'pl1', stage_id: 's3', stage_entered_at: hours(30), value: 250, currency: 'ILS', status: 'open', lost_reason: null, expected_close_date: null, owner_id: 'u2', created_at: days(2) },
  { id: 'd5', title: 'نور البطة — دورة الذكاء الاصطناعي للأعمال', contact_id: 'c10', organization_id: null, product_id: 'p2', pipeline_id: 'pl1', stage_id: 's5', stage_entered_at: hours(50), value: 250, currency: 'ILS', status: 'open', lost_reason: null, expected_close_date: null, owner_id: 'u3', created_at: days(18) },
  { id: 'd6', title: 'سلمى نجم — دورة صناعة المحتوى بالذكاء الاصطناعي', contact_id: 'c8', organization_id: 'o4', product_id: 'p3', pipeline_id: 'pl1', stage_id: 's6', stage_entered_at: days(5), value: 200, currency: 'ILS', status: 'won', lost_reason: null, expected_close_date: null, owner_id: 'u2', created_at: days(30) },
  { id: 'd7', title: 'رنا مشتهى — دورة الأتمتة بالذكاء الاصطناعي (n8n)', contact_id: 'c5', organization_id: 'o2', product_id: 'p1', pipeline_id: 'pl1', stage_id: 's7', stage_entered_at: days(3), value: 250, currency: 'ILS', status: 'lost', lost_reason: 'السعر مرتفع بالنسبة لها في هذه الفترة', expected_close_date: null, owner_id: 'u2', created_at: days(22) },

  // --- B2B ---
  { id: 'd8', title: 'د. سامي حرب — SmartClinic', contact_id: 'c2', organization_id: 'o1', product_id: 'p5', pipeline_id: 'pl2', stage_id: 't5', stage_entered_at: days(12), value: 250, currency: 'ILS', status: 'won', lost_reason: null, expected_close_date: null, owner_id: 'u2', created_at: days(40) },
  { id: 'd9', title: 'د. هبة قنديل — SmartClinic', contact_id: 'c6', organization_id: 'o5', product_id: 'p5', pipeline_id: 'pl2', stage_id: 't4', stage_entered_at: hours(96), value: 250, currency: 'ILS', status: 'open', lost_reason: null, expected_close_date: dateIn(10), owner_id: 'u1', created_at: days(11) },
  { id: 'd10', title: 'محمد أبو ندى — Mojeeb', contact_id: 'c4', organization_id: 'o3', product_id: 'p4', pipeline_id: 'pl2', stage_id: 't3', stage_entered_at: hours(60), value: 150, currency: 'ILS', status: 'open', lost_reason: null, expected_close_date: dateIn(7), owner_id: 'u1', created_at: days(15) },
  { id: 'd11', title: 'رنا مشتهى — SmartSalon', contact_id: 'c5', organization_id: 'o2', product_id: 'p6', pipeline_id: 'pl2', stage_id: 't2', stage_entered_at: hours(18), value: 150, currency: 'ILS', status: 'open', lost_reason: null, expected_close_date: null, owner_id: 'u2', created_at: days(8) },
  { id: 'd12', title: 'سلمى نجم — Imagen', contact_id: 'c8', organization_id: 'o4', product_id: 'p7', pipeline_id: 'pl2', stage_id: 't1', stage_entered_at: hours(5), value: 500, currency: 'ILS', status: 'open', lost_reason: null, expected_close_date: null, owner_id: 'u2', created_at: days(1) },
]

export const activities: Activity[] = [
  { id: 'a1', contact_id: 'c1', deal_id: 'd1', type: 'whatsapp', direction: 'in', summary: 'سأل عن سعر دورة n8n ومواعيدها', body: 'مرحباً، أريد معرفة تفاصيل دورة الأتمتة وسعرها', occurred_at: days(9), created_by: null, source: 'bot' },
  { id: 'a2', contact_id: 'c1', deal_id: 'd1', type: 'whatsapp', direction: 'out', summary: 'أرسل البوت إليه التفاصيل والسعر', body: null, occurred_at: days(9), created_by: null, source: 'bot' },
  { id: 'a3', contact_id: 'c1', deal_id: 'd1', type: 'whatsapp', direction: 'in', summary: 'وافق على التسجيل وطلب رقم الحساب', body: null, occurred_at: days(4), created_by: null, source: 'bot' },
  { id: 'a4', contact_id: 'c1', deal_id: 'd1', type: 'call', direction: 'out', summary: 'تحدّثت معه، وأفاد بأنه سيحوّل المبلغ هذا الأسبوع', body: 'مشغول بالعمل، ووعد بالتحويل يوم الخميس.', occurred_at: hours(74), created_by: 'u2', source: 'manual' },
  { id: 'a5', contact_id: 'c2', deal_id: 'd8', type: 'meeting', direction: 'none', summary: 'اجتماع بالعيادة — عرضنا سمارت كلينيك', body: 'أعجبه نظام الحجوزات، واستفسر عن الدعم الفني.', occurred_at: days(20), created_by: 'u2', source: 'manual' },
  { id: 'a6', contact_id: 'c2', deal_id: 'd8', type: 'system', direction: 'none', summary: 'انتقلت الصفقة تلقائياً إلى مرحلة «تعاقد» بعد تأكيد الدفع', body: null, occurred_at: days(12), created_by: null, source: 'manual' },
  { id: 'a7', contact_id: 'c3', deal_id: 'd2', type: 'whatsapp', direction: 'in', summary: 'استفسرت عن دورة المحتوى بعد مشاهدتها الإعلان', body: null, occurred_at: days(4), created_by: null, source: 'bot' },
  { id: 'a8', contact_id: 'c3', deal_id: 'd2', type: 'whatsapp', direction: 'out', summary: 'أرسل البوت إليها الموعد والسعر', body: null, occurred_at: hours(20), created_by: null, source: 'bot' },
  { id: 'a9', contact_id: 'c6', deal_id: 'd9', type: 'call', direction: 'out', summary: 'مكالمة تعارف؛ طلبت فترة تجربة لأسبوعين', body: null, occurred_at: days(6), created_by: 'u1', source: 'manual' },
  { id: 'a10', contact_id: 'c4', deal_id: 'd10', type: 'whatsapp', direction: 'out', summary: 'أرسلنا عرض السعر لـ Mojeeb', body: null, occurred_at: hours(60), created_by: 'u1', source: 'manual' },
  { id: 'a11', contact_id: 'c9', deal_id: 'd4', type: 'whatsapp', direction: 'in', summary: 'وافق على التسجيل في الدورة', body: null, occurred_at: hours(30), created_by: null, source: 'bot' },
  { id: 'a12', contact_id: 'c5', deal_id: 'd7', type: 'note', direction: 'none', summary: 'اعتذرت عن التسجيل بسبب السعر', body: 'أشارت إلى إمكانية التسجيل في الدورة القادمة.', occurred_at: days(3), created_by: 'u2', source: 'manual' },
]

export const tasks: Task[] = [
  { id: 'k1', title: 'ذكّر أحمد بالتحويل', deal_id: 'd1', contact_id: 'c1', due_at: hours(26), assigned_to: 'u2', status: 'open', completed_at: null },
  { id: 'k2', title: 'أول تواصل', deal_id: 'd3', contact_id: 'c7', due_at: hours(3), assigned_to: 'u3', status: 'open', completed_at: null },
  { id: 'k3', title: 'أرسل رابط الدورة إلى خالد', deal_id: 'd4', contact_id: 'c9', due_at: inDays(0.2), assigned_to: 'u2', status: 'open', completed_at: null },
  { id: 'k4', title: 'تابع تجربة عيادة الشفاء', deal_id: 'd9', contact_id: 'c6', due_at: inDays(0.4), assigned_to: 'u1', status: 'open', completed_at: null },
  { id: 'k5', title: 'اتصل بمحمد بخصوص عرض مجيب', deal_id: 'd10', contact_id: 'c4', due_at: hours(50), assigned_to: 'u1', status: 'open', completed_at: null },
  { id: 'k6', title: 'أول تواصل', deal_id: 'd12', contact_id: 'c8', due_at: inDays(0.8), assigned_to: 'u2', status: 'open', completed_at: null },
  { id: 'k7', title: 'أرسل شهادة الحضور إلى سلمى', deal_id: 'd6', contact_id: 'c8', due_at: days(2), assigned_to: 'u2', status: 'done', completed_at: days(2) },
]

export const payments: Payment[] = [
  { id: 'y1', deal_id: 'd1', amount: 250, currency: 'ILS', method: 'wallet', status: 'needs_checking', receipt_url: null, paid_at: null, verified_by: null, note: 'سُجّلت من البوت', created_at: hours(20) },
  { id: 'y2', deal_id: 'd5', amount: 250, currency: 'ILS', method: 'bank_transfer', status: 'paid', receipt_url: null, paid_at: hours(50), verified_by: 'u1', note: null, created_at: hours(52) },
  { id: 'y3', deal_id: 'd6', amount: 200, currency: 'ILS', method: 'cash', status: 'paid', receipt_url: null, paid_at: days(6), verified_by: 'u2', note: null, created_at: days(6) },
  { id: 'y4', deal_id: 'd8', amount: 250, currency: 'ILS', method: 'bank_transfer', status: 'paid', receipt_url: null, paid_at: days(12), verified_by: 'u2', note: null, created_at: days(12) },
  { id: 'y5', deal_id: 'd4', amount: 100, currency: 'ILS', method: 'wallet', status: 'needs_checking', receipt_url: null, paid_at: null, verified_by: null, note: 'عربون — سُجّلت من البوت', created_at: hours(6) },
  { id: 'y6', deal_id: 'd10', amount: 150, currency: 'ILS', method: 'other', status: 'not_paid', receipt_url: null, paid_at: null, verified_by: null, note: null, created_at: hours(60) },
]

export const subscriptions: Subscription[] = [
  { id: 'b1', organization_id: 'o1', contact_id: null, product_id: 'p5', deal_id: 'd8', plan_name: 'سمارت كلينيك — باقة العيادة', monthly_amount: 250, currency: 'ILS', start_date: dateIn(-40), renewal_date: dateIn(3), status: 'active', churn_reason: null, owner_id: 'u2' },
  { id: 'b2', organization_id: 'o3', contact_id: null, product_id: 'p4', deal_id: null, plan_name: 'مجيب — باقة أساسية', monthly_amount: 150, currency: 'ILS', start_date: dateIn(-70), renewal_date: dateIn(12), status: 'active', churn_reason: null, owner_id: 'u1' },
  { id: 'b3', organization_id: 'o2', contact_id: null, product_id: 'p6', deal_id: null, plan_name: 'سمارت صالون', monthly_amount: 150, currency: 'ILS', start_date: dateIn(-25), renewal_date: dateIn(-2), status: 'active', churn_reason: null, owner_id: 'u2' },
  { id: 'b4', organization_id: 'o4', contact_id: null, product_id: 'p4', deal_id: null, plan_name: 'مجيب — باقة المراكز', monthly_amount: 150, currency: 'ILS', start_date: dateIn(-95), renewal_date: dateIn(22), status: 'active', churn_reason: null, owner_id: 'u2' },
  { id: 'b5', organization_id: 'o5', contact_id: null, product_id: 'p5', deal_id: null, plan_name: 'سمارت كلينيك — تجربة', monthly_amount: 250, currency: 'ILS', start_date: dateIn(-10), renewal_date: dateIn(5), status: 'paused', churn_reason: null, owner_id: 'u1' },
]
