import { MobileNav, Sidebar } from '@/components/layout/sidebar'
import { QuickAdd } from '@/components/layout/quick-add'
import { getDataset, isLive } from '@/lib/data'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const data = await getDataset()

  return (
    <div className="flex min-h-screen bg-page">
      {/* بالعربي أول عنصر بالصف يظهر على اليمين — فالسايدبار يمين تلقائياً */}
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {!isLive() && <DemoBanner />}
        <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-8">{children}</main>
      </div>

      <MobileNav />
      <QuickAdd contacts={data.contacts} products={data.products} />
    </div>
  )
}

/** شريط يوضّح إنو البيانات تجريبية — حتى ما حدا يظن إنها بياناته الحقيقية */
function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 bg-accent-soft px-4 py-2 text-center text-xs font-semibold text-accent">
      <span>هذه بيانات تجريبية للمعاينة.</span>
      <span className="font-normal">
        بمجرّد إضافة مفاتيح Supabase إلى ملف ‎.env.local‎ ستظهر بياناتك الحقيقية.
      </span>
    </div>
  )
}
