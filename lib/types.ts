/** أنواع البيانات — مطابقة لسكيمة قاعدة البيانات بـ supabase/migrations */

export type Role = 'admin' | 'sales' | 'operator'
export type OrgType = 'clinic' | 'salon' | 'shop' | 'company' | 'school' | 'other'
export type ContactSource =
  | 'whatsapp_bot' | 'facebook_ad' | 'referral' | 'workshop' | 'manual' | 'other'
export type DealStatus = 'open' | 'won' | 'lost'
export type ActivityType = 'whatsapp' | 'call' | 'meeting' | 'note' | 'email' | 'system'
export type ActivitySource = 'manual' | 'bot' | 'n8n'
export type PaymentStatus = 'paid' | 'needs_checking' | 'not_paid' | 'refunded'
export type PaymentMethod = 'bank_transfer' | 'cash' | 'wallet' | 'other'
export type SubscriptionStatus = 'active' | 'paused' | 'churned'
export type TaskStatus = 'open' | 'done' | 'cancelled'
export type ProductKind = 'course' | 'subscription' | 'service'

export interface User {
  id: string
  full_name: string
  phone: string | null
  role: Role
  avatar_color: string
  active: boolean
}

export interface Product {
  id: string
  name: string
  kind: ProductKind
  default_price: number | null
  currency: string
  color: string
  active: boolean
}

export interface Pipeline {
  id: string
  name: string
  product_kind: ProductKind
}

export interface Stage {
  id: string
  pipeline_id: string
  name: string
  sort_order: number
  color: string
  is_won: boolean
  is_lost: boolean
  is_paid_stage: boolean
}

export interface Organization {
  id: string
  name: string
  type: OrgType
  sector: string | null
  city: string | null
  website: string | null
  notes: string | null
  owner_id: string | null
}

export interface Contact {
  id: string
  full_name: string
  phone: string
  email: string | null
  city: string | null
  preferred_language: 'ar' | 'en'
  source: ContactSource
  source_detail: string | null
  organization_id: string | null
  role_in_org: string | null
  owner_id: string | null
  notes: string | null
  created_at: string
}

export interface Deal {
  id: string
  title: string
  contact_id: string
  organization_id: string | null
  product_id: string
  pipeline_id: string
  stage_id: string
  stage_entered_at: string
  value: number
  currency: string
  status: DealStatus
  lost_reason: string | null
  expected_close_date: string | null
  owner_id: string | null
  created_at: string
}

export interface Activity {
  id: string
  contact_id: string
  deal_id: string | null
  type: ActivityType
  direction: 'in' | 'out' | 'none'
  summary: string | null
  body: string | null
  occurred_at: string
  created_by: string | null
  source: ActivitySource
}

export interface Task {
  id: string
  title: string
  deal_id: string | null
  contact_id: string | null
  due_at: string
  assigned_to: string | null
  status: TaskStatus
  completed_at: string | null
}

export interface Payment {
  id: string
  deal_id: string
  amount: number
  currency: string
  /** سعر الصرف وقت القبض — مثبَّت، لا يتحرّك بعدها */
  fx_rate: number | null
  /** المبلغ بعملة الأساس، محسوباً بذلك السعر */
  amount_base: number | null
  method: PaymentMethod
  status: PaymentStatus
  receipt_url: string | null
  paid_at: string | null
  verified_by: string | null
  note: string | null
  created_at: string
}

export interface Subscription {
  id: string
  organization_id: string | null
  contact_id: string | null
  product_id: string
  deal_id: string | null
  plan_name: string | null
  monthly_amount: number
  currency: string
  start_date: string | null
  renewal_date: string | null
  status: SubscriptionStatus
  churn_reason: string | null
  owner_id: string | null
}

// ---- أشكال مركّبة تستعملها الشاشات -------------------------------------

/** بطاقة على بورد الصفقات */
export interface DealCard extends Deal {
  contact: Contact
  product: Product
  stage: Stage
  owner: User | null
  hours_in_stage: number
  /** المسدَّد بعملة الصفقة — ليُطرح من قيمتها مباشرة */
  paid_total: number
  /** القيمة والمسدَّد بعملة الأساس — كل مجموع يُبنى على هذين لا على الأصل */
  value_base: number
  paid_total_base: number
}

export interface ContactRow extends Contact {
  organization: Organization | null
  owner: User | null
  deals_count: number
  last_activity_at: string | null
}

export interface PaymentRow extends Payment {
  deal: Deal
  contact: Contact
  product: Product
}

export interface SubscriptionRow extends Subscription {
  product: Product
  organization: Organization | null
  contact: Contact | null
  days_until_renewal: number | null
}

export interface QueueTask extends Task {
  contact: Contact | null
  deal: Deal | null
  overdue: boolean
}

export interface TodayStats {
  open_deals: number
  /** مجموع قيمة الصفقات المفتوحة — المال المتوقَّع، لا المقبوض */
  open_value: number
  awaiting_payment: number
  /** ما دخل الصندوق فعلاً هذا الشهر */
  collected_this_month: number
  /** صفقات اعتبرناها منتهية ولم يصل مقابلها كاملاً */
  uncollected: number
  mrr: number
  renewals_this_month: number
}
