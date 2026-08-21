import Link from 'next/link'
import { PageHeader } from '@/components/hints/page-header'
import { DealsBoard } from '@/components/deals/board'
import { buildDealCards, getDataset, isLive, stagesFor } from '@/lib/data'
import { pageHints } from '@/lib/hints'
import { cn } from '@/lib/utils'

export default async function DealsPage({
  searchParams,
}: {
  searchParams: { pipeline?: string }
}) {
  const data = await getDataset()

  const pipeline =
    data.pipelines.find((p) => p.id === searchParams.pipeline) ?? data.pipelines[0]

  if (!pipeline) return null

  const stages = stagesFor(data, pipeline.id)
  const deals = buildDealCards(data, pipeline.id)

  return (
    <>
      <PageHeader title="الصفقات" hint={pageHints.deals} term="deal" />

      {/* تبويبات المسارات — مجموعة رمادية والفعّال بطاقة بيضاء */}
      <div className="mb-4 inline-flex items-center gap-1 rounded-[10px] bg-[#EDEFF3] p-1">
        {data.pipelines.map((p) => (
          <Link
            key={p.id}
            href={`/deals?pipeline=${p.id}`}
            className={cn(
              'rounded-chip px-4 py-1.5 text-body font-semibold transition-colors duration-150',
              p.id === pipeline.id
                ? 'bg-card text-ink'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {p.name}
          </Link>
        ))}
      </div>

      <DealsBoard
        deals={deals}
        stages={stages}
        products={data.products}
        users={data.users}
        contacts={data.contacts.map((c) => ({ id: c.id, full_name: c.full_name }))}
        baseCurrency={data.money.base}
        live={isLive()}
      />
    </>
  )
}
