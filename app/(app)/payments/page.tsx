import { PageHeader } from '@/components/hints/page-header'
import { PaymentsTable } from '@/components/shared/payments-table'
import { buildPaymentRows, getDataset, isLive } from '@/lib/data'
import { pageHints } from '@/lib/hints'

export default async function PaymentsPage() {
  const data = await getDataset()
  const rows = buildPaymentRows(data)

  return (
    <>
      <PageHeader title="المدفوعات" hint={pageHints.payments} term="needsChecking" />
      <PaymentsTable rows={rows} live={isLive()} />
    </>
  )
}
