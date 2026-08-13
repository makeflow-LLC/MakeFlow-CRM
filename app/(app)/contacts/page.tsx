import Link from 'next/link'
import { Upload } from 'lucide-react'
import { PageHeader } from '@/components/hints/page-header'
import { Button } from '@/components/ui/button'
import { ContactsTable } from '@/components/contacts/contacts-table'
import { buildContactRows, getDataset } from '@/lib/data'
import { microcopy, pageHints } from '@/lib/hints'

export default async function ContactsPage() {
  const data = await getDataset()
  const rows = buildContactRows(data)

  return (
    <>
      <PageHeader
        title="جهات الاتصال"
        hint={pageHints.contacts}
        action={
          <Button asChild variant="outline">
            <Link href="/contacts/import">
              <Upload className="h-4 w-4" />
              {microcopy.buttons.importContacts}
            </Link>
          </Button>
        }
      />
      <ContactsTable rows={rows} />
    </>
  )
}
