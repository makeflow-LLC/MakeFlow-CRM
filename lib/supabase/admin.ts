import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * عميل الإدارة — مفتاح service_role.
 *
 * هذا المفتاح يتجاوز سياسات RLS بالكامل، فاستعماله محصور في ملف واحد لا
 * تستورده إلا إجراءات إدارة الفريق في lib/team.ts، وكل إجراء منها يتحقّق
 * أولاً من أنّ المنادي مديرٌ فعّال. السطر الأول أعلاه يجعل البناء يفشل إن
 * حاول أي مكوّن يعمل في المتصفح استيراد هذا الملف.
 *
 * لماذا نحتاجه أصلاً: إنشاء حساب دخول أو تغيير كلمة مرور شخص آخر أو تعطيل
 * حسابه عملياتٌ لا تتيحها Supabase إلا لهذا المفتاح. البديل الوحيد هو فتح
 * التسجيل الذاتي للعموم، وهو أسوأ بكثير.
 *
 * المفتاح متغيّر بيئة عادي (بلا بادئة NEXT_PUBLIC_)، فلا يصل إلى المتصفح.
 */

export function hasAdminKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY غير مضبوط')
  }

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
