import { MobileNav, Sidebar } from '@/components/layout/sidebar'
import { Topbar, type SearchItem } from '@/components/layout/topbar'
import { QuickAdd } from '@/components/layout/quick-add'
import { buildQueue, dataMode, getDataset } from '@/lib/data'
import { viewerStatus } from '@/lib/team'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const status = await viewerStatus()

  // جلسةٌ بلا صفّ موظف فعّال لا تقرأ شيئاً من قاعدة البيانات. عرض التطبيق
  // فارغاً في هذه الحالة يوهم بعطل، فنقولها كما هي.
  if (status.signedIn && (!status.linked || !status.active)) {
    return <NoAccess active={status.active} linked={status.linked} />
  }

  const data = await getDataset()
  const { dueToday, overdue, needsChecking } = buildQueue(data)

  /**
   * فهرس البحث الشامل: الأشخاص والجهات والصفقات في قائمة واحدة.
   * يُبنى على الخادم مرة واحدة ويُرشَّح في المتصفح — حجمه بضع مئات من
   * الصفوف، فالتصفية عليه أسرع من أي رحلة إلى الخادم.
   */
  const orgById = new Map(data.organizations.map((o) => [o.id, o]))
  const productById = new Map(data.products.map((p) => [p.id, p]))
  const contactById = new Map(data.contacts.map((c) => [c.id, c]))

  const index: SearchItem[] = [
    ...data.contacts.map((c) => ({
      id: c.id,
      label: c.full_name,
      sub: c.phone,
      href: `/contacts/${c.id}`,
      kind: 'contact' as const,
    })),
    ...data.organizations.map((o) => ({
      id: o.id,
      label: o.name,
      sub: [o.city, o.sector].filter(Boolean).join(' · ') || 'جهة',
      href: `/organizations/${o.id}`,
      kind: 'organization' as const,
    })),
    ...data.deals.map((d) => ({
      id: d.id,
      label: contactById.get(d.contact_id)?.full_name ?? d.title,
      sub: productById.get(d.product_id)?.name ?? '',
      // الصفقة لا شاشة مستقلة لها؛ ملف صاحبها هو مكانها الطبيعي
      href: `/contacts/${d.contact_id}`,
      kind: 'deal' as const,
    })),
  ]

  const badges = {
    '/': dueToday.length + overdue.length || undefined,
    '/payments': needsChecking.length || undefined,
  }

  const activeStaff = data.users.filter((u) => u.active).length

  return (
    <div className="flex min-h-screen bg-page">
      {/* بالعربي أول عنصر بالصف يظهر على اليمين — فالسايدبار يمين تلقائياً */}
      <Sidebar
        badges={badges}
        seats={activeStaff > 0 ? { members: activeStaff, seats: 3 } : undefined}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          index={index}
          viewer={status.name ? { name: status.name, color: status.color } : null}
          alerts={overdue.length + needsChecking.length}
          quickAdd={<QuickAdd contacts={data.contacts} products={data.products} variant="bar" />}
        />
        <ModeBanner />
        <main className="flex-1 px-4 pb-24 pt-6 md:px-7.5 md:pb-14 md:pt-6.5">{children}</main>
      </div>

      <MobileNav />
      {/* الزر العائم للهاتف وحده — على الحاسوب زر «إضافة» في الشريط العلوي */}
      <QuickAdd contacts={data.contacts} products={data.products} />
    </div>
  )
}

function NoAccess({ linked, active }: { linked: boolean; active: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-6">
      <div className="max-w-md rounded-card border border-line bg-card p-8 text-center">
        <h1 className="mb-3 text-xl font-bold text-ink">
          {!linked ? 'حسابك غير مرتبط بعضو في الفريق' : 'حسابك معطَّل'}
        </h1>
        <p className="mb-6 text-body leading-relaxed text-ink-muted">
          {!linked
            ? 'دخولك تمّ بنجاح، لكن لم يُربط حسابك بأي عضو، فلا تظهر لك أي بيانات. اطلب من مدير النظام إضافتك من شاشة «الفريق».'
            : 'عطّل مدير النظام هذا الحساب، فلم يعد يصل إلى البيانات. راجعه إن كان ذلك عن غير قصد.'}
        </p>
        <a
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-input bg-accent px-4 text-body font-semibold text-white transition-colors duration-150 hover:bg-accent-hover"
        >
          العودة إلى صفحة الدخول
        </a>
      </div>
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
      <div className="flex flex-wrap items-center justify-center gap-2 border-b border-line bg-chip-danger-bg px-4 py-2 text-center text-faint font-semibold text-chip-danger-fg">
        <span>تعذّر الاتصال بقاعدة البيانات، وما تراه الآن ليس بياناتك.</span>
        <span className="font-normal">تحقّق من المفاتيح والاتصال ثم حدّث الصفحة.</span>
        {error && <span className="hidden font-normal opacity-70 lg:inline">({error})</span>}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-b border-line bg-accent-soft px-4 py-2 text-center text-faint font-semibold text-chip-accent-fg">
      <span>هذه بيانات تجريبية للمعاينة.</span>
      <span className="font-normal">
        بمجرّد إضافة مفاتيح Supabase إلى ملف ‎.env.local‎ ستظهر بياناتك الحقيقية.
      </span>
    </div>
  )
}
