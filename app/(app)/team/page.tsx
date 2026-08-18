import { PageHeader } from '@/components/hints/page-header'
import { TeamManager } from '@/components/team/team-manager'
import { getTeam } from '@/lib/team'
import { pageHints } from '@/lib/hints'

/** الحسابات تتغيّر من هذه الشاشة نفسها، فلا يصحّ أن تُخزَّن الصفحة. */
export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const view = await getTeam()

  return (
    <>
      <PageHeader title="الفريق" hint={pageHints.team} />
      <TeamManager view={view} />
    </>
  )
}
