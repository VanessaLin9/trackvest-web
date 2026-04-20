import { formatCurrencyWithCode, roundTo } from '../../../lib/formatters'
import type {
  PortfolioRebalanceResponse,
  PortfolioRebalanceSuggestion,
} from '../../../lib/portfolio.service'

/**
 * Display-only enrichment of a raw rebalance suggestion with the
 * user-facing price converted into the portfolio display currency.
 */
export type PricedRebalanceSuggestion = PortfolioRebalanceSuggestion & {
  /** Price in the current display currency, or null if FX was missing. */
  displayPrice: number | null
  displayPriceCurrency: string | null
  /** Quantity implied by `suggestedBuyAmount / displayPrice` at load time. */
  initialQuantity: number | null
}

/**
 * A priced suggestion reconciled against the user's in-flight quantity
 * edits. `amount` is recomputed from `quantity * displayPrice` so the
 * preview reacts live to slider/input tweaks.
 */
export type DisplayedRebalanceSuggestion = PricedRebalanceSuggestion & {
  quantity: number
  amount: number
}

/**
 * The raw rebalance response extended with a couple of derived fields
 * the panel needs (final suggestion list + total recommended buy).
 */
export type RebalancePlan = PortfolioRebalanceResponse & {
  totalRecommendedBuyAmount: number
  suggestions: PortfolioRebalanceSuggestion[]
}

export type RebalanceDraftPreview = {
  totalAdded: number
  projectedEquity: number
  projectedBond: number
  equityShift: number
  bondShift: number
}

/**
 * Resolves the primary/secondary strings to show in the rebalance table
 * price cell. Primary is always the latest price in its own currency;
 * secondary is the converted display-currency price, shown only when it
 * differs from the latest currency.
 */
export function getRebalancePriceDisplay(
  suggestion: Pick<
    PricedRebalanceSuggestion,
    'latestPrice' | 'latestPriceCurrency' | 'displayPrice' | 'displayPriceCurrency'
  >,
  locale: string,
) {
  if (suggestion.latestPrice == null) {
    return {
      primary: null,
      secondary: null,
    }
  }

  return {
    primary: formatCurrencyWithCode(
      suggestion.latestPrice,
      locale,
      suggestion.latestPriceCurrency,
    ),
    secondary:
      (
        suggestion.displayPrice != null &&
        suggestion.displayPriceCurrency &&
        suggestion.latestPriceCurrency &&
        suggestion.displayPriceCurrency !== suggestion.latestPriceCurrency
      )
        ? formatCurrencyWithCode(
            suggestion.displayPrice,
            locale,
            suggestion.displayPriceCurrency,
          )
        : null,
  }
}

/**
 * Client-side fallback for splitting the recommended buy amount per
 * asset class across candidate assets. We proportionally distribute by
 * each candidate's current weight within its class, and hand any
 * rounding leftover to the last candidate to ensure sums match.
 *
 * This exists because the API can return empty `suggestions` when the
 * server doesn't want to opinionate on picks — but the UI still wants
 * reasonable defaults so the user can tweak quantities.
 */
export function buildClientRebalanceSuggestions(
  data: PortfolioRebalanceResponse,
): PortfolioRebalanceSuggestion[] {
  const candidates = data.candidates ?? []
  const suggestions: PortfolioRebalanceSuggestion[] = []

  for (const assetClass of ['equity', 'bond'] as const) {
    const classBuyAmount = Math.max(0, data.recommendedBuyAmountByAssetClass[assetClass])

    if (classBuyAmount <= 1e-9) {
      continue
    }

    const classCandidates = candidates.filter(
      (candidate) =>
        candidate.assetClass === assetClass &&
        candidate.latestPrice != null &&
        candidate.latestPrice > 0,
    )

    if (classCandidates.length === 0) {
      continue
    }

    const totalWeight = classCandidates.reduce(
      (sum, candidate) => sum + Math.max(candidate.currentWeightWithinAssetClass, 0),
      0,
    )
    let remainingAmount = classBuyAmount

    classCandidates.forEach((candidate, index) => {
      const latestPrice = candidate.latestPrice

      if (latestPrice == null || latestPrice <= 0) {
        return
      }

      const normalizedWeight =
        totalWeight > 0
          ? Math.max(candidate.currentWeightWithinAssetClass, 0) / totalWeight
          : 1 / classCandidates.length
      const isLast = index === classCandidates.length - 1
      const suggestedBuyAmount = isLast
        ? remainingAmount
        : Math.min(remainingAmount, roundTo(classBuyAmount * normalizedWeight))

      remainingAmount = Math.max(0, roundTo(remainingAmount - suggestedBuyAmount))

      suggestions.push({
        assetClass,
        assetId: candidate.assetId,
        symbol: candidate.symbol,
        name: candidate.name,
        currentMarketValue: candidate.currentMarketValue,
        currentWeightWithinAssetClass: candidate.currentWeightWithinAssetClass,
        suggestedBuyAmount,
        estimatedQuantity: roundTo(suggestedBuyAmount / latestPrice),
        latestPrice,
        latestPriceCurrency: candidate.latestPriceCurrency ?? candidate.assetBaseCurrency,
      })
    })
  }

  return suggestions.filter((suggestion) => suggestion.suggestedBuyAmount > 1e-9)
}
