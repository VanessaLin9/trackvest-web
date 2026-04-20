import { useI18n } from '../../../i18n'
import {
  getRebalancePriceDisplay,
  type PricedRebalanceSuggestion,
} from './rebalance-helpers'

interface RebalancePriceCellProps {
  suggestion: Pick<
    PricedRebalanceSuggestion,
    'latestPrice' | 'latestPriceCurrency' | 'displayPrice' | 'displayPriceCurrency'
  >
}

export function RebalancePriceCell({ suggestion }: RebalancePriceCellProps) {
  const { t, locale } = useI18n()
  const priceDisplay = getRebalancePriceDisplay(suggestion, locale)

  if (!priceDisplay.primary) {
    return <p className="text-sm text-slate-700">{t('common.notAvailable')}</p>
  }

  return (
    <div className="space-y-0.5">
      <p className="text-sm text-slate-700">{priceDisplay.primary}</p>
      {priceDisplay.secondary ? (
        <p className="text-xs text-slate-400">{priceDisplay.secondary}</p>
      ) : null}
    </div>
  )
}
