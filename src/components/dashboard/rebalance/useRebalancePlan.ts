import { useQueries, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { fxService } from '../../../lib/fx.service'
import { roundTo } from '../../../lib/formatters'
import { portfolioService } from '../../../lib/portfolio.service'
import {
  queryKeys,
  resolveDisplayCurrencyKey,
} from '../../../lib/query-keys'
import {
  buildClientRebalanceSuggestions,
  type DisplayedRebalanceSuggestion,
  type PricedRebalanceSuggestion,
  type RebalanceDraftPreview,
  type RebalancePlan,
} from './rebalance-helpers'

interface UseRebalancePlanArgs {
  currentUserId: string
  displayCurrency: string | null
  requestedDisplayCurrency: string | undefined
}

export interface UseRebalancePlanResult {
  isLoading: boolean
  error: unknown
  rebalancePlan: RebalancePlan | null
  displayedSuggestions: DisplayedRebalanceSuggestion[]
  draftPreview: RebalanceDraftPreview | null

  targetEquityPercent: number
  draftEquityPercent: number
  draftBondPercent: number
  isTargetUnlocked: boolean
  hoverLabel: string | null
  quantityDrafts: Record<string, string>

  setDraftEquityPercent: (value: number) => void
  setHoverLabel: (label: string | null) => void
  onTargetLockToggle: () => void
  onQuantityChange: (assetId: string, value: string) => void
}

/**
 * Encapsulates every piece of rebalance state, server query, FX
 * lookup, and derived memo used by <RebalancePanel>. The hook is
 * deliberately fat so Dashboard.tsx can stay oblivious to the rebalance
 * machinery — it just mounts <RebalancePanel> and passes the user id +
 * display currency.
 */
export function useRebalancePlan({
  currentUserId,
  displayCurrency,
  requestedDisplayCurrency,
}: UseRebalancePlanArgs): UseRebalancePlanResult {
  const [targetEquityPercent, setTargetEquityPercent] = useState(80)
  const [draftEquityPercent, setDraftEquityPercent] = useState(80)
  const [isTargetUnlocked, setIsTargetUnlocked] = useState(false)
  const [hoverLabel, setHoverLabel] = useState<string | null>(null)
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({})

  const draftBondPercent = 100 - draftEquityPercent
  const targetEquity = targetEquityPercent / 100
  const targetBond = (100 - targetEquityPercent) / 100

  const rebalanceQuery = useQuery({
    queryKey: queryKeys.portfolio.rebalance(
      currentUserId,
      resolveDisplayCurrencyKey(requestedDisplayCurrency),
      targetEquityPercent,
    ),
    queryFn: () =>
      portfolioService.getRebalance({
        ...(requestedDisplayCurrency
          ? { preferredBaseCurrency: requestedDisplayCurrency }
          : {}),
        targetEquity,
        targetBond,
      }),
    enabled: Boolean(currentUserId),
  })

  // When the backend returns a plan, seed our local target/draft state
  // with the server-suggested split — but only while the user hasn't
  // manually unlocked the slider, otherwise we'd stomp their edits.
  useEffect(() => {
    if (!rebalanceQuery.data || isTargetUnlocked) {
      return
    }

    const nextTargetEquityPercent = Math.round(rebalanceQuery.data.targets.equity * 100)
    setTargetEquityPercent(nextTargetEquityPercent)
    setDraftEquityPercent(nextTargetEquityPercent)
  }, [isTargetUnlocked, rebalanceQuery.data])

  const rebalancePlan = useMemo<RebalancePlan | null>(() => {
    const data = rebalanceQuery.data

    if (!data || data.trackedMarketValue <= 0) {
      return null
    }

    const totalRecommendedBuyAmount =
      Math.max(0, data.recommendedBuyAmountByAssetClass.equity) +
      Math.max(0, data.recommendedBuyAmountByAssetClass.bond)
    const computedSuggestions = buildClientRebalanceSuggestions(data)
    const suggestions =
      computedSuggestions.length > 0 ? computedSuggestions : (data.suggestions ?? [])

    return {
      ...data,
      totalRecommendedBuyAmount,
      suggestions,
    }
  }, [rebalanceQuery.data])

  // Unique FX pairs required to convert each suggestion's latest price
  // into `displayCurrency`. We dedupe by `"${base}->${quote}"` so we
  // don't fire redundant queries when several holdings share a currency.
  const fxPairs = useMemo(() => {
    if (!rebalancePlan?.suggestions?.length || !displayCurrency) {
      return []
    }

    return Array.from(
      new Set(
        rebalancePlan.suggestions
          .filter(
            (suggestion) =>
              suggestion.latestPrice != null &&
              suggestion.latestPriceCurrency &&
              suggestion.latestPriceCurrency !== displayCurrency,
          )
          .map((suggestion) => `${suggestion.latestPriceCurrency}->${displayCurrency}`),
      ),
    ).map((pair) => {
      const [base, quote] = pair.split('->')
      return { base, quote }
    })
  }, [displayCurrency, rebalancePlan?.suggestions])

  const fxRateQueries = useQueries({
    queries: fxPairs.map((pair) => ({
      queryKey: queryKeys.fx.todayRate(pair.base, pair.quote),
      queryFn: () => fxService.getTodayRate({ base: pair.base, quote: pair.quote }),
      enabled: Boolean(currentUserId),
    })),
  })

  const fxRates = useMemo(
    () =>
      Object.fromEntries(
        fxPairs.map((pair, index) => [
          `${pair.base}->${pair.quote}`,
          fxRateQueries[index]?.data?.rate ?? null,
        ]),
      ),
    [fxPairs, fxRateQueries],
  )

  const pricedSuggestions = useMemo<PricedRebalanceSuggestion[]>(() => {
    if (!rebalancePlan?.suggestions?.length) {
      return []
    }

    return rebalancePlan.suggestions.map((suggestion) => {
      const latestPriceCurrency = suggestion.latestPriceCurrency
      const needsFxConversion =
        suggestion.latestPrice != null &&
        latestPriceCurrency &&
        displayCurrency &&
        latestPriceCurrency !== displayCurrency
      const conversionRate = needsFxConversion
        ? fxRates[`${latestPriceCurrency}->${displayCurrency}`] ?? null
        : null
      const displayPrice =
        suggestion.latestPrice == null
          ? null
          : needsFxConversion
            ? conversionRate != null
              ? roundTo(suggestion.latestPrice * conversionRate)
              : null
            : suggestion.latestPrice
      const initialQuantity =
        displayPrice != null && displayPrice > 0
          ? roundTo(suggestion.suggestedBuyAmount / displayPrice)
          : null

      return {
        ...suggestion,
        displayPrice,
        displayPriceCurrency:
          displayPrice != null ? (displayCurrency ?? latestPriceCurrency) : null,
        initialQuantity,
      }
    })
  }, [displayCurrency, fxRates, rebalancePlan?.suggestions])

  const displayedSuggestions = useMemo<DisplayedRebalanceSuggestion[]>(() => {
    if (pricedSuggestions.length === 0) {
      return []
    }

    return pricedSuggestions.map((suggestion) => {
      const quantityDraft = quantityDrafts[suggestion.assetId]
      const parsedQuantity =
        quantityDraft != null && quantityDraft.trim() !== ''
          ? Number(quantityDraft)
          : suggestion.initialQuantity
      const quantity =
        typeof parsedQuantity === 'number' &&
        Number.isFinite(parsedQuantity) &&
        parsedQuantity >= 0
          ? parsedQuantity
          : (suggestion.initialQuantity ?? 0)
      const amount =
        suggestion.displayPrice != null
          ? roundTo(quantity * suggestion.displayPrice, 8)
          : suggestion.suggestedBuyAmount

      return {
        ...suggestion,
        quantity,
        amount,
      }
    })
  }, [pricedSuggestions, quantityDrafts])

  // Seed the quantity inputs with the server's initial quantities on
  // first load. Skips any asset the user has already typed into so we
  // don't wipe out in-progress edits when the query refetches.
  useEffect(() => {
    if (pricedSuggestions.length === 0) {
      return
    }

    setQuantityDrafts((current) => {
      const nextDrafts = { ...current }
      let didChange = false

      pricedSuggestions.forEach((suggestion) => {
        const currentValue = current[suggestion.assetId]
        if (currentValue != null && currentValue !== '') {
          return
        }

        const nextValue =
          suggestion.initialQuantity != null ? suggestion.initialQuantity.toFixed(2) : ''

        if (current[suggestion.assetId] !== nextValue) {
          nextDrafts[suggestion.assetId] = nextValue
          didChange = true
        }
      })

      return didChange ? nextDrafts : current
    })
  }, [pricedSuggestions])

  const draftPreview = useMemo<RebalanceDraftPreview | null>(() => {
    if (!rebalancePlan || displayedSuggestions.length === 0) {
      return null
    }

    const addedEquity = displayedSuggestions
      .filter((suggestion) => suggestion.assetClass === 'equity')
      .reduce((sum, suggestion) => sum + suggestion.amount, 0)
    const addedBond = displayedSuggestions
      .filter((suggestion) => suggestion.assetClass === 'bond')
      .reduce((sum, suggestion) => sum + suggestion.amount, 0)
    const totalAdded = addedEquity + addedBond
    const nextTrackedMarketValue = rebalancePlan.trackedMarketValue + totalAdded

    if (nextTrackedMarketValue <= 1e-9) {
      return null
    }

    const projectedEquity =
      (rebalancePlan.marketValueByAssetClass.equity + addedEquity) / nextTrackedMarketValue
    const projectedBond =
      (rebalancePlan.marketValueByAssetClass.bond + addedBond) / nextTrackedMarketValue

    return {
      totalAdded,
      projectedEquity,
      projectedBond,
      equityShift: projectedEquity - rebalancePlan.current.equity,
      bondShift: projectedBond - rebalancePlan.current.bond,
    }
  }, [displayedSuggestions, rebalancePlan])

  const onTargetLockToggle = () => {
    if (isTargetUnlocked) {
      setTargetEquityPercent(draftEquityPercent)
      setIsTargetUnlocked(false)
      return
    }

    setDraftEquityPercent(targetEquityPercent)
    setIsTargetUnlocked(true)
  }

  const onQuantityChange = (assetId: string, value: string) => {
    setQuantityDrafts((current) => ({
      ...current,
      [assetId]: value,
    }))
  }

  return {
    isLoading: rebalanceQuery.isLoading,
    error: rebalanceQuery.error,
    rebalancePlan,
    displayedSuggestions,
    draftPreview,
    targetEquityPercent,
    draftEquityPercent,
    draftBondPercent,
    isTargetUnlocked,
    hoverLabel,
    quantityDrafts,
    setDraftEquityPercent,
    setHoverLabel,
    onTargetLockToggle,
    onQuantityChange,
  }
}
