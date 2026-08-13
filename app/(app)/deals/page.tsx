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

      {/* تبويبات المسارات */}
      <div className="mb-6 inline-flex items-center gap-1 rounded-input border border-line bg-card p-1">
        {data.pipelines.map((p) => (
          <Link
            key={p.id}
            href={`/deals?pipeline=${p.id}`}
            className={cn(
              'rounded-[6px] px-4 py-2 text-sm font-semibold transition-all duration-150',
              p.id === pipeline.id
                ? 'bg-accent text-white'
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
        live={isLive()}
      />
    </>
  )
}
