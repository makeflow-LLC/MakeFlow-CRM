import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/hints/page-header'
import { ImportWizard } from '@/components/contacts/import-wizard'
import { getDataset, isLive } from '@/lib/data'
import { pageHints } from '@/lib/hints'

export default async function ImportContactsPage() {
  const data = await getDataset()

  return (
    <>
      {/* السهم يشير يميناً لأن الرجوع في العربية يكون نحو اليمين */}
      <Link
        href="/contacts"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-ink-muted transition-colors duration-150 hover:text-accent"
      >
        <ChevronRight className="h-4 w-4" />
        جهات الاتصال
      </Link>

      <PageHeader title="استيراد جهات الاتصال" hint={pageHints.contactsImport} />

      <ImportWizard
        contacts={data.contacts.map((c) => ({
          id: c.id,
          full_name: c.full_name,
          phone: c.phone,
        }))}
        products={data.products
          .filter((p) => p.active)
          .map((p) => ({ id: p.id, name: p.name }))}
        live={isLive()}
      />
    </>
  )
}
