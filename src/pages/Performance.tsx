import { AnnualBuyAllocationCard } from '../components/performance/AnnualBuyAllocationCard'
import { AnnualRealizedCard } from '../components/performance/AnnualRealizedCard'
import { AssetHistoryCard } from '../components/performance/AssetHistoryCard'

export default function Performance() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AnnualRealizedCard />
      <AnnualBuyAllocationCard variant="page" />
      <AssetHistoryCard variant="page" />
    </div>
  )
}
