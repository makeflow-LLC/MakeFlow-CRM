import { PageHeader } from '@/components/hints/page-header'
import { ContactsTable } from '@/components/contacts/contacts-table'
import { buildContactRows, getDataset } from '@/lib/data'
import { pageHints } from '@/lib/hints'

export default async function ContactsPage() {
  const data = await getDataset()
  const rows = buildContactRows(data)

  return (
    <>
      <PageHeader title="جهات الاتصال" hint={pageHints.contacts} />
      <ContactsTable rows={rows} />
    </>
  )
}
