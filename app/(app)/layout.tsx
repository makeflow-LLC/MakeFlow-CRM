import { MobileNav, Sidebar } from '@/components/layout/sidebar'
import { QuickAdd } from '@/components/layout/quick-add'
import { dataMode, getDataset } from '@/lib/data'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const data = await getDataset()

  return (
    <div className="flex min-h-screen bg-page">
      {/* بالعربي أول عنصر بالصف يظهر على اليمين — فالسايدبار يمين تلقائياً */}
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <ModeBanner />
        <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-8">{children}</main>
      </div>

      <MobileNav />
      <QuickAdd contacts={data.contacts} products={data.products} />
    </div>
  )
}

/**
 * شريط الحالة أعلى الشاشة.
 *
 * الحالة الثالثة (error) هي الأهم: حين تكون المفاتيح مضبوطة ويفشل الاتصال،
 * يجب أن يعرف المستخدم ذلك صراحةً بدل أن يرى جداول فارغة يظنّها بياناته.
 */
function ModeBanner() {
  const { mode, error } = dataMode()

  if (mode === 'live') return null

  if (mode === 'error') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 bg-danger/10 px-4 py-2 text-center text-xs font-semibold text-danger">
        <span>تعذّر الاتصال بقاعدة البيانات، وما تراه الآن ليس بياناتك.</span>
        <span className="font-normal">تحقّق من المفاتيح والاتصال ثم حدّث الصفحة.</span>
        {error && <span className="hidden font-normal opacity-70 lg:inline">({error})</span>}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 bg-accent-soft px-4 py-2 text-center text-xs font-semibold text-accent">
      <span>هذه بيانات تجريبية للمعاينة.</span>
      <span className="font-normal">
        بمجرّد إضافة مفاتيح Supabase إلى ملف ‎.env.local‎ ستظهر بياناتك الحقيقية.
      </span>
    </div>
  )
}
