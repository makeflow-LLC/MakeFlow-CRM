import { PageHeader } from '@/components/hints/page-header'
import { PaymentsTable } from '@/components/shared/payments-table'
import { AddPayment } from '@/components/payments/add-payment'
import { buildDealCards, buildPaymentRows, getDataset, isLive } from '@/lib/data'
import { pageHints } from '@/lib/hints'

export default async function PaymentsPage() {
  const data = await getDataset()
  const rows = buildPaymentRows(data)
  const deals = buildDealCards(data)

  return (
    <>
      <PageHeader
        title="المدفوعات"
        hint={pageHints.payments}
        term="needsChecking"
        action={<AddPayment deals={deals} money={data.money} />}
      />
      <PaymentsTable rows={rows} live={isLive()} deals={deals} money={data.money} />
    </>
  )
}
