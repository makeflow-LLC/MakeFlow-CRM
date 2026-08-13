import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * عميل Supabase على السيرفر — يمرّر جلسة المستخدم حتى سياسات RLS
 * تشتغل باسمه. المفتاح المستعمل هنا هو anon key فقط.
 */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // بينادى من Server Component — التحديث يتم بالـ middleware
          }
        },
      },
    },
  )
}
