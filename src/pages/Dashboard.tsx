import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useCurrentUserId } from '../app/current-user'
import type {
  AllocationChartItem,
  ChartValue,
  PerformanceDatum,
  TrendPoint,
} from '../components/dashboard/PortfolioCharts'
import { useI18n } from '../i18n'
import {
  portfolioService,
  type PortfolioRebalanceResponse,
  type PortfolioRebalanceSuggestion,
  type PortfolioHolding,
} from '../lib/portfolio.service'
import {
  usePreferencesStore,
  type AllocationViewMode,
} from '../store/preferences'
import { fxService } from '../lib/fx.service'

const AllocationChartCard = lazy(() =>
  import('../components/dashboard/PortfolioCharts').then((module) => ({
    default: module.AllocationChartCard,
  })),
)
const PerformanceChartCard = lazy(() =>
  import('../components/dashboard/PortfolioCharts').then((module) => ({
    default: module.PerformanceChartCard,
  })),
)
const PortfolioTrendChartCard = lazy(() =>
  import('../components/dashboard/PortfolioCharts').then((module) => ({
    default: module.PortfolioTrendChartCard,
  })),
)
const HoldingTrendChartCard = lazy(() =>
  import('../components/dashboard/PortfolioCharts').then((module) => ({
    default: module.HoldingTrendChartCard,
  })),
)
const PORTFOLIO_COLORS = ['#0f766e', '#2563eb', '#f59e0b', '#9333ea', '#ef4444']

function getErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === 'object' && 'response' in err) {
    const message = (err.response as { data?: { message?: string } })?.data?.message
    return message ?? fallback
  }

  if (err instanceof Error) {
    return err.message
  }

  return fallback
}

function formatCurrency(value: number, locale: string) {
  return value.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function formatCurrencyWithCode(
  value: number,
  locale: string,
  currency?: string | null,
) {
  const formattedValue = formatCurrency(value, locale)
  return currency ? `${formattedValue} ${currency}` : formattedValue
}

function formatSignedCurrency(
  value: number,
  locale: string,
  currency?: string | null,
) {
  const prefix = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${prefix}${formatCurrency(Math.abs(value), locale)}${currency ? ` ${currency}` : ''}`
}

function formatCompactCurrencyAxis(value: number, locale: string) {
  const absoluteValue = Math.abs(value)

  if (absoluteValue < 1000) {
    return formatCurrency(value, locale)
  }

  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: absoluteValue < 10000 ? 1 : 0,
  }).format(value)
}

function getHoldingLatestPriceCurrency(holding: PortfolioHolding) {
  return holding.latestPriceCurrency ?? holding.assetBaseCurrency
}

function formatPercent(
  value: number,
  options: { signed?: boolean } = {},
) {
  const { signed = true } = options
  const prefix =
    signed && value > 0 ? '+' : signed && value < 0 ? '-' : ''

  return `${prefix}${(Math.abs(value) * 100).toFixed(2)}%`
}

function formatPercentPoints(value: number) {
  const prefix = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${prefix}${Math.abs(value * 100).toFixed(2)}pp`
}

function roundTo(value: number, digits = 8) {
  return Number(value.toFixed(digits))
}

function formatHoldingType(
  type: PortfolioHolding['type'],
  t: (key: string) => string,
) {
  switch (type) {
    case 'equity':
      return t('assets.typeEquity')
    case 'etf':
      return t('assets.typeEtf')
    case 'crypto':
      return t('assets.typeCrypto')
    case 'cash':
      return t('assets.typeCash')
    default:
      return type
  }
}

function formatHoldingAssetClass(
  assetClass: PortfolioHolding['assetClass'],
  t: (key: string) => string,
) {
  switch (assetClass) {
    case 'equity':
      return t('dashboard.assetClassEquity')
    case 'bond':
      return t('dashboard.assetClassBond')
    case 'cash':
      return t('dashboard.assetClassCash')
    case 'crypto':
      return t('dashboard.assetClassCrypto')
    case 'precious_metal':
      return t('dashboard.assetClassPreciousMetal')
    default:
      return t('common.notAvailable')
  }
}

function formatAllocationLabel(
  id: string,
  fallback: string,
  t: (key: string) => string,
) {
  switch (id) {
    case 'equity':
      return t('dashboard.assetClassEquity')
    case 'bond':
      return t('dashboard.assetClassBond')
    case 'etf':
      return t('assets.typeEtf')
    case 'precious_metal':
      return t('dashboard.assetClassPreciousMetal')
    case 'crypto':
      return t('dashboard.assetClassCrypto')
    case 'cash':
      return t('dashboard.assetClassCash')
    case 'marketValue':
      return t('dashboard.marketValue')
    case 'costBasis':
      return t('dashboard.costBasis')
    default:
      return fallback
  }
}

function formatSnapshotDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatFxRate(value: number, locale: string) {
  return value.toLocaleString(locale, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })
}

function getHoldingBarColor(pnl: number) {
  if (pnl > 0) {
    return '#0f766e'
  }

  if (pnl < 0) {
    return '#dc2626'
  }

  return '#94a3b8'
}

function getAllocationColor(type: string) {
  switch (type) {
    case 'equity':
      return '#2563eb'
    case 'bond':
      return '#14b8a6'
    case 'etf':
      return '#0f766e'
    case 'crypto':
      return '#f59e0b'
    case 'cash':
      return '#9333ea'
    case 'precious_metal':
      return '#ca8a04'
    default:
      return '#94a3b8'
  }
}

function buildClientRebalanceSuggestions(
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

function renderTooltipValue(
  value: ChartValue,
  locale: string,
  currency?: string | null,
): string {
  if (value === undefined) {
    return ''
  }

  if (Array.isArray(value)) {
    return value.join(' / ')
  }

  if (typeof value !== 'number') {
    return String(value)
  }

  return formatCurrencyWithCode(value, locale, currency)
}

function ChartCardFallback({
  title,
  description,
  heightClass = 'h-72',
}: {
  title: string
  description: string
  heightClass?: string
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className={`rounded-2xl bg-gray-50 ${heightClass} animate-pulse`} />
    </div>
  )
}

function DashboardLoadingState() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="h-64 animate-pulse rounded-[2rem] bg-slate-100" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-3xl bg-slate-100"
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="h-96 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-96 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    </div>
  )
}

function LockIcon({ unlocked = false }: { unlocked?: boolean }) {
  if (unlocked) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6.5 8V6.5a3.5 3.5 0 1 1 7 0" />
        <path d="M10 11v2.5" />
        <rect x="4.5" y="8" width="11" height="8" rx="2" />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.5 8V6.5a3.5 3.5 0 1 1 7 0V8" />
      <path d="M10 11v2.5" />
      <rect x="4.5" y="8" width="11" height="8" rx="2" />
    </svg>
  )
}

function ApplyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 10.5 8.2 13.7 15 7" />
    </svg>
  )
}

export default function Dashboard() {
  const currentUserId = useCurrentUserId()
  const { t, locale } = useI18n()
  const [selectedHoldingId, setSelectedHoldingId] = useState<string | null>(null)
  const [rebalanceTargetEquityPercent, setRebalanceTargetEquityPercent] = useState(80)
  const [rebalanceDraftEquityPercent, setRebalanceDraftEquityPercent] = useState(80)
  const [isRebalanceTargetUnlocked, setIsRebalanceTargetUnlocked] = useState(false)
  const [rebalanceHoverLabel, setRebalanceHoverLabel] = useState<string | null>(null)
  const [rebalanceQuantityDrafts, setRebalanceQuantityDrafts] = useState<Record<string, string>>({})
  const {
    displayCurrencyMode,
    preferredBaseCurrency,
    allocationViewMode,
    setDisplayCurrencyMode,
    setPreferredBaseCurrency,
    setAllocationViewMode,
  } = usePreferencesStore()
  const requestedDisplayCurrency =
    displayCurrencyMode === 'base' ? preferredBaseCurrency : undefined
  const rebalanceTargetBondPercent = 100 - rebalanceTargetEquityPercent
  const rebalanceDraftBondPercent = 100 - rebalanceDraftEquityPercent
  const rebalanceTargetEquity = rebalanceTargetEquityPercent / 100
  const rebalanceTargetBond = rebalanceTargetBondPercent / 100

  const summaryQuery = useQuery({
    queryKey: ['portfolio', 'summary', currentUserId, requestedDisplayCurrency ?? 'default'],
    queryFn: () =>
      portfolioService.getSummary(
        requestedDisplayCurrency
          ? { preferredBaseCurrency: requestedDisplayCurrency }
          : undefined,
      ),
    enabled: Boolean(currentUserId),
  })

  const fxRateQuery = useQuery({
    queryKey: ['fx', 'today-rate', 'USD', 'TWD'],
    queryFn: () => fxService.getTodayRate({ base: 'USD', quote: 'TWD' }),
    enabled: Boolean(currentUserId),
  })

  const holdingsQuery = useQuery({
    queryKey: ['portfolio', 'holdings', currentUserId, requestedDisplayCurrency ?? 'default'],
    queryFn: () =>
      portfolioService.getHoldings(
        requestedDisplayCurrency
          ? { preferredBaseCurrency: requestedDisplayCurrency }
          : undefined,
      ),
    enabled: Boolean(currentUserId),
  })

  const trendQuery = useQuery({
    queryKey: ['portfolio', 'trend', currentUserId, requestedDisplayCurrency ?? 'default'],
    queryFn: () =>
      portfolioService.getTrend(
        requestedDisplayCurrency
          ? { preferredBaseCurrency: requestedDisplayCurrency }
          : undefined,
      ),
    enabled: Boolean(currentUserId),
  })

  const rebalanceQuery = useQuery({
    queryKey: [
      'portfolio',
      'rebalance',
      currentUserId,
      requestedDisplayCurrency ?? 'default',
      rebalanceTargetEquityPercent,
    ],
    queryFn: () =>
      portfolioService.getRebalance(
        {
          ...(requestedDisplayCurrency
            ? { preferredBaseCurrency: requestedDisplayCurrency }
            : {}),
          targetEquity: rebalanceTargetEquity,
          targetBond: rebalanceTargetBond,
        },
      ),
    enabled: Boolean(currentUserId),
  })

  const holdings = holdingsQuery.data?.items ?? []
  const summary = summaryQuery.data
  const displayCurrency =
    summary?.effectiveDisplayCurrency ??
    holdingsQuery.data?.effectiveDisplayCurrency ??
    trendQuery.data?.effectiveDisplayCurrency ??
    summary?.baseCurrency ??
    null
  const isBaseCurrencyAligned =
    summary?.displayCurrencyMode === 'preferred-base' &&
    summary.effectiveDisplayCurrency === preferredBaseCurrency

  useEffect(() => {
    setSelectedHoldingId((current) =>
      current && holdings.some((holding) => holding.assetId === current)
        ? current
        : holdings[0]?.assetId ?? null,
    )
  }, [holdings])

  useEffect(() => {
    if (!rebalanceQuery.data || isRebalanceTargetUnlocked) {
      return
    }

    const nextTargetEquityPercent = Math.round(rebalanceQuery.data.targets.equity * 100)
    setRebalanceTargetEquityPercent(nextTargetEquityPercent)
    setRebalanceDraftEquityPercent(nextTargetEquityPercent)
  }, [isRebalanceTargetUnlocked, rebalanceQuery.data])

  useEffect(() => {
    if (!rebalanceQuery.data) {
      return
    }

    const nextDrafts = Object.fromEntries(
      (buildClientRebalanceSuggestions(rebalanceQuery.data).length > 0
        ? buildClientRebalanceSuggestions(rebalanceQuery.data)
        : (rebalanceQuery.data.suggestions ?? [])
      ).map((suggestion) => [
        suggestion.assetId,
        suggestion.estimatedQuantity.toFixed(2),
      ]),
    )

    setRebalanceQuantityDrafts(nextDrafts)
  }, [rebalanceQuery.data])

  const selectedHolding = useMemo(
    () => holdings.find((holding) => holding.assetId === selectedHoldingId) ?? null,
    [holdings, selectedHoldingId],
  )

  const holdingTrendQuery = useQuery({
    queryKey: [
      'portfolio',
      'holding-trend',
      currentUserId,
      selectedHolding?.assetId,
      requestedDisplayCurrency ?? 'default',
    ],
    queryFn: () =>
      portfolioService.getHoldingTrend(
        selectedHolding!.assetId,
        requestedDisplayCurrency
          ? { preferredBaseCurrency: requestedDisplayCurrency }
          : undefined,
      ),
    enabled: Boolean(currentUserId && selectedHolding?.assetId),
  })

  const hasAssetClassAllocation =
    (holdingsQuery.data?.allocationByAssetClass?.length ?? 0) > 0
  const effectiveAllocationViewMode: AllocationViewMode =
    allocationViewMode === 'assetClass' && hasAssetClassAllocation
      ? 'assetClass'
      : 'type'

  const allocationChartData = useMemo<AllocationChartItem[]>(
    () => {
      if (effectiveAllocationViewMode === 'assetClass') {
        return (holdingsQuery.data?.allocationByAssetClass ?? []).map((item) => ({
          id: item.assetClass,
          label: formatAllocationLabel(item.assetClass, item.assetClass, t),
          value: Number((item.weight * 100).toFixed(2)),
          color: getAllocationColor(item.assetClass),
        }))
      }

      return (holdingsQuery.data?.allocationByType ?? []).map((item) => ({
        id: item.type,
        label: formatAllocationLabel(item.type, item.type, t),
        value: Number((item.weight * 100).toFixed(2)),
        color: getAllocationColor(item.type),
      }))
    },
    [
      effectiveAllocationViewMode,
      holdingsQuery.data?.allocationByAssetClass,
      holdingsQuery.data?.allocationByType,
      t,
    ],
  )

  const performanceData = useMemo<PerformanceDatum[]>(
    () =>
      holdings.map((holding, index) => ({
        symbol: holding.symbol,
        pnl: holding.pnl,
        color: holdings.length > 0
          ? getHoldingBarColor(holding.pnl) || PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length]
          : PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length],
      })),
    [holdings],
  )

  const rebalancePlan = useMemo(() => {
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

  const displayedRebalanceSuggestions = useMemo(() => {
    if (!rebalancePlan?.suggestions?.length) {
      return []
    }

    return rebalancePlan.suggestions.map((suggestion) => {
      const quantityDraft = rebalanceQuantityDrafts[suggestion.assetId]
      const parsedQuantity =
        quantityDraft != null && quantityDraft.trim() !== ''
          ? Number(quantityDraft)
          : suggestion.estimatedQuantity
      const quantity = Number.isFinite(parsedQuantity) && parsedQuantity >= 0
        ? parsedQuantity
        : suggestion.estimatedQuantity
      const amount =
        suggestion.latestPrice != null
          ? roundTo(quantity * suggestion.latestPrice, 8)
          : suggestion.suggestedBuyAmount

      return {
        ...suggestion,
        quantity,
        amount,
      }
    })
  }, [rebalancePlan?.suggestions, rebalanceQuantityDrafts])

  const rebalanceDraftPreview = useMemo(() => {
    if (!rebalancePlan || displayedRebalanceSuggestions.length === 0) {
      return null
    }

    const addedEquity = displayedRebalanceSuggestions
      .filter((suggestion) => suggestion.assetClass === 'equity')
      .reduce((sum, suggestion) => sum + suggestion.amount, 0)
    const addedBond = displayedRebalanceSuggestions
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
  }, [displayedRebalanceSuggestions, rebalancePlan])

  const handleRebalanceTargetLockToggle = () => {
    if (isRebalanceTargetUnlocked) {
      setRebalanceTargetEquityPercent(rebalanceDraftEquityPercent)
      setIsRebalanceTargetUnlocked(false)
      return
    }

    setRebalanceDraftEquityPercent(rebalanceTargetEquityPercent)
    setIsRebalanceTargetUnlocked(true)
  }

  const handleRebalanceQuantityChange = (assetId: string, value: string) => {
    setRebalanceQuantityDrafts((current) => ({
      ...current,
      [assetId]: value,
    }))
  }

  const portfolioTrendData = useMemo<TrendPoint[]>(
    () =>
      (trendQuery.data?.points ?? []).map((point) => ({
        label: point.label,
        invested: point.investedCapital,
        marketValue: point.marketValue,
      })),
    [trendQuery.data?.points],
  )

  const selectedHoldingTrendData = useMemo<TrendPoint[]>(
    () =>
      (holdingTrendQuery.data?.points ?? []).map((point) => ({
        label: point.label,
        invested: point.investedAmount,
        marketValue: point.marketValue,
      })),
    [holdingTrendQuery.data?.points],
  )

  const selectedHoldingAllocation = useMemo<AllocationChartItem[]>(
    () => {
      if (!selectedHolding) {
        return []
      }

      return [
        {
          id: 'marketValue',
          label: formatAllocationLabel('marketValue', 'Market value', t),
          value: selectedHolding.marketValue,
          color: '#2563eb',
        },
        {
          id: 'costBasis',
          label: formatAllocationLabel('costBasis', 'Cost basis', t),
          value: selectedHolding.investedAmount,
          color: '#cbd5e1',
        },
      ]
    },
    [selectedHolding, t],
  )

  const overviewErrorMessage = useMemo(() => {
    const error = summaryQuery.error ?? holdingsQuery.error ?? trendQuery.error ?? null
    return error ? getErrorMessage(error, t('dashboard.failedToLoad')) : null
  }, [holdingsQuery.error, summaryQuery.error, t, trendQuery.error])

  const selectedTrendErrorMessage = useMemo(() => {
    if (!holdingTrendQuery.error) {
      return null
    }

    return getErrorMessage(holdingTrendQuery.error, t('dashboard.failedToLoad'))
  }, [holdingTrendQuery.error, t])

  const fxRateErrorMessage = useMemo(() => {
    if (!fxRateQuery.error) {
      return null
    }

    return getErrorMessage(fxRateQuery.error, t('dashboard.fxRateUnavailable'))
  }, [fxRateQuery.error, t])

  const displayModeStatusMessage = useMemo(() => {
    if (summary?.displayCurrencyMode === 'portfolio-default') {
      return t('dashboard.displayModeStatusOriginal', {
        currency: summary.effectiveDisplayCurrency ?? t('common.notAvailable'),
      })
    }

    if (isBaseCurrencyAligned) {
      return t('dashboard.displayModeStatusBaseAligned', {
        currency: summary?.effectiveDisplayCurrency ?? preferredBaseCurrency,
      })
    }

    return t('dashboard.displayModeStatusBasePending', {
      currency: preferredBaseCurrency,
      currentCurrency:
        summary?.effectiveDisplayCurrency ?? t('common.notAvailable'),
    })
  }, [isBaseCurrencyAligned, preferredBaseCurrency, summary?.displayCurrencyMode, summary?.effectiveDisplayCurrency, t])

  const isInitialLoading =
    Boolean(currentUserId) &&
    !summary &&
    !holdingsQuery.data &&
    !trendQuery.data &&
    (summaryQuery.isLoading || holdingsQuery.isLoading || trendQuery.isLoading)

  if (!currentUserId) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-3xl font-semibold">{t('dashboard.title')}</h1>
        <p className="text-red-600">{t('common.envDemoUserMissing')}</p>
      </div>
    )
  }

  if (isInitialLoading) {
    return <DashboardLoadingState />
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#1d4ed8_0%,#0f172a_44%,#020617_100%)] p-7 text-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.28em] text-blue-200">
                {t('dashboard.heroEyebrow')}
              </p>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  {t('dashboard.heroTitle')}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
                  {t('dashboard.heroDescription')}
                </p>
              </div>
            </div>

            <div className="min-w-[220px] rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-blue-100">
                {t('dashboard.snapshotLabel')}
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {formatSignedCurrency(summary?.totalPnl ?? 0, locale, displayCurrency)}
              </p>
              <p className="mt-2 text-sm text-slate-200">
                {summary
                  ? t('dashboard.snapshotAsOf', {
                      date: formatSnapshotDate(summary.asOf, locale),
                    })
                  : t('dashboard.snapshotLiveNotice')}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-700">
            {t('dashboard.scopeEyebrow')}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-amber-950">
            {t('dashboard.scopeTitle')}
          </h2>
          <p className="mt-3 text-sm leading-6 text-amber-900/80">
            {t('dashboard.scopeDescription')}
          </p>
          <div className="mt-5 rounded-2xl border border-amber-200/80 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-700">
              {t('dashboard.displayPreferencesTitle')}
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-900/80">
              {t('dashboard.displayPreferencesDescription')}
            </p>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                  {t('dashboard.displayCurrencyModeLabel')}
                </p>
                <div className="inline-flex rounded-full border border-amber-200 bg-white p-1">
                  {[
                    {
                      value: 'original',
                      label: t('dashboard.displayCurrencyModeOriginal'),
                    },
                    {
                      value: 'base',
                      label: t('dashboard.displayCurrencyModeBase'),
                    },
                  ].map((option) => {
                    const isActive = displayCurrencyMode === option.value

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setDisplayCurrencyMode(option.value as typeof displayCurrencyMode)
                        }
                        aria-pressed={isActive}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          isActive
                            ? 'bg-amber-500 text-white'
                            : 'text-amber-900 hover:bg-amber-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div
                aria-hidden={displayCurrencyMode !== 'base'}
                className={`min-w-[13rem] transition-opacity duration-200 ${
                  displayCurrencyMode === 'base'
                    ? 'opacity-100'
                    : 'pointer-events-none opacity-0'
                }`}
              >
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                  {t('dashboard.preferredBaseCurrencyLabel')}
                </p>
                <div className="inline-flex rounded-full border border-amber-200 bg-white p-1">
                  {['TWD', 'USD'].map((currency) => {
                    const isActive = preferredBaseCurrency === currency

                    return (
                      <button
                        key={currency}
                        type="button"
                        onClick={() =>
                          setPreferredBaseCurrency(currency as typeof preferredBaseCurrency)
                        }
                        aria-pressed={isActive}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          isActive
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {currency}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-700">
                {t('dashboard.displayModeStatusLabel')}
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-950/85">
                {displayModeStatusMessage}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                {t('dashboard.assetCount')}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {summary?.holdingsCount ?? 0}
              </p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                {t('dashboard.totalReturn')}
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">
                {formatPercent(summary?.totalReturnRate ?? 0)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-200/80 bg-white/80 px-4 py-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-700">
              {t('dashboard.fxRateTitle')}
            </p>
            {fxRateQuery.isLoading ? (
              <p className="mt-2 text-sm text-amber-900/80">
                {t('dashboard.fxRateLoading')}
              </p>
            ) : fxRateErrorMessage ? (
              <p className="mt-2 text-sm text-red-700">{fxRateErrorMessage}</p>
            ) : fxRateQuery.data ? (
              <>
                <div className="mt-2 flex items-baseline gap-3">
                  <p className="text-xl font-semibold text-slate-900">
                    {formatFxRate(fxRateQuery.data.rate, locale)}
                  </p>
                  <p className="text-sm text-amber-900/80">
                    {t('dashboard.fxRatePair', {
                      base: fxRateQuery.data.base,
                      quote: fxRateQuery.data.quote,
                    })}
                  </p>
                </div>
                <p className="mt-1 text-sm text-amber-900/80">
                  {t('dashboard.fxRateMeta', {
                    date: fxRateQuery.data.date,
                    provider: fxRateQuery.data.provider,
                  })}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-amber-900/80">
                {t('dashboard.fxRateUnavailable')}
              </p>
            )}
          </div>
        </div>
      </section>

      {overviewErrorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {overviewErrorMessage}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">{t('dashboard.investedCapital')}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatCurrencyWithCode(summary?.investedCapital ?? 0, locale, displayCurrency)}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {t('dashboard.investedCapitalHint')}
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">{t('dashboard.marketValue')}</p>
          <p className="mt-3 text-3xl font-semibold text-blue-700">
            {formatCurrencyWithCode(summary?.marketValue ?? 0, locale, displayCurrency)}
          </p>
          <p className="mt-2 text-xs text-gray-500">{t('dashboard.marketValueHint')}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">{t('dashboard.totalPnl')}</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-700">
            {formatSignedCurrency(summary?.totalPnl ?? 0, locale, displayCurrency)}
          </p>
          <p className="mt-2 text-xs text-gray-500">{t('dashboard.pnlDescription')}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">{t('dashboard.totalReturn')}</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-700">
            {formatPercent(summary?.totalReturnRate ?? 0)}
          </p>
          <p className="mt-2 text-xs text-gray-500">{t('dashboard.returnDescription')}</p>
        </div>
      </section>

      {holdings.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
          <h2 className="text-xl font-semibold text-slate-900">
            {t('dashboard.emptyTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            {t('dashboard.emptyDescription')}
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
            <Suspense
              fallback={
                <ChartCardFallback
                  title={t('dashboard.allocationTitle')}
                  description={t('dashboard.allocationDescription')}
                />
              }
            >
              <AllocationChartCard
                title={t('dashboard.allocationTitle')}
                description={
                  effectiveAllocationViewMode === 'assetClass'
                    ? t('dashboard.allocationDescriptionAssetClass')
                    : t('dashboard.allocationDescriptionType')
                }
                data={allocationChartData}
                headerRight={
                  hasAssetClassAllocation ? (
                    <div>
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500">
                        {t('dashboard.allocationViewLabel')}
                      </p>
                      <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                        {([
                          {
                            value: 'assetClass',
                            label: t('dashboard.allocationViewAssetClass'),
                          },
                          {
                            value: 'type',
                            label: t('dashboard.allocationViewType'),
                          },
                        ] as const).map((option) => {
                          const isActive = effectiveAllocationViewMode === option.value

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setAllocationViewMode(option.value)}
                              aria-pressed={isActive}
                              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                                isActive
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-700 hover:bg-white'
                              }`}
                            >
                              {option.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : null
                }
              />
            </Suspense>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  {t('dashboard.rebalanceEyebrow')}
                </p>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {t('dashboard.rebalanceTitle')}
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  {t('dashboard.rebalanceDescription')}
                </p>
              </div>

              {rebalanceQuery.isLoading ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-600">
                  {t('dashboard.loading')}
                </div>
              ) : rebalanceQuery.error ? (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-700">
                  {getErrorMessage(rebalanceQuery.error, t('dashboard.failedToLoad'))}
                </div>
              ) : rebalancePlan ? (
                <div className="mt-6 space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center justify-center">
                      <div className="relative flex h-64 w-64 items-center justify-center">
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 220 220"
                          className="absolute inset-0 h-full w-full -rotate-90"
                        >
                          <circle
                            cx="110"
                            cy="110"
                            r="94"
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="30"
                            strokeDasharray={`${rebalancePlan.current.equity * 100} ${100 - rebalancePlan.current.equity * 100}`}
                            pathLength="100"
                            className="cursor-help"
                            onMouseEnter={() =>
                              setRebalanceHoverLabel(
                                `${t('dashboard.rebalanceCurrentLabel')} ${t('dashboard.assetClassEquity')} ${formatPercent(rebalancePlan.current.equity, {
                                  signed: false,
                                })}`,
                              )
                            }
                            onMouseLeave={() => setRebalanceHoverLabel(null)}
                          >
                            <title>
                              {`${t('dashboard.rebalanceCurrentLabel')} ${t('dashboard.assetClassEquity')} ${formatPercent(rebalancePlan.current.equity, {
                                signed: false,
                              })}`}
                            </title>
                          </circle>
                          <circle
                            cx="110"
                            cy="110"
                            r="94"
                            fill="none"
                            stroke="#14b8a6"
                            strokeWidth="30"
                            strokeDasharray={`${(1 - rebalancePlan.current.equity) * 100} ${rebalancePlan.current.equity * 100}`}
                            strokeDashoffset={-rebalancePlan.current.equity * 100}
                            pathLength="100"
                            className="cursor-help"
                            onMouseEnter={() =>
                              setRebalanceHoverLabel(
                                `${t('dashboard.rebalanceCurrentLabel')} ${t('dashboard.assetClassBond')} ${formatPercent(rebalancePlan.current.bond, {
                                  signed: false,
                                })}`,
                              )
                            }
                            onMouseLeave={() => setRebalanceHoverLabel(null)}
                          >
                            <title>
                              {`${t('dashboard.rebalanceCurrentLabel')} ${t('dashboard.assetClassBond')} ${formatPercent(rebalancePlan.current.bond, {
                                signed: false,
                              })}`}
                            </title>
                          </circle>
                          <circle
                            cx="110"
                            cy="110"
                            r="62"
                            fill="none"
                            stroke="#93c5fd"
                            strokeWidth="26"
                            strokeDasharray={`${rebalancePlan.targets.equity * 100} ${100 - rebalancePlan.targets.equity * 100}`}
                            pathLength="100"
                            className="cursor-help"
                            onMouseEnter={() =>
                              setRebalanceHoverLabel(
                                `${t('dashboard.rebalanceTargetLabel')} ${t('dashboard.assetClassEquity')} ${formatPercent(rebalancePlan.targets.equity, {
                                  signed: false,
                                })}`,
                              )
                            }
                            onMouseLeave={() => setRebalanceHoverLabel(null)}
                          >
                            <title>
                              {`${t('dashboard.rebalanceTargetLabel')} ${t('dashboard.assetClassEquity')} ${formatPercent(rebalancePlan.targets.equity, {
                                signed: false,
                              })}`}
                            </title>
                          </circle>
                          <circle
                            cx="110"
                            cy="110"
                            r="62"
                            fill="none"
                            stroke="#99f6e4"
                            strokeWidth="26"
                            strokeDasharray={`${(1 - rebalancePlan.targets.equity) * 100} ${rebalancePlan.targets.equity * 100}`}
                            strokeDashoffset={-rebalancePlan.targets.equity * 100}
                            pathLength="100"
                            className="cursor-help"
                            onMouseEnter={() =>
                              setRebalanceHoverLabel(
                                `${t('dashboard.rebalanceTargetLabel')} ${t('dashboard.assetClassBond')} ${formatPercent(rebalancePlan.targets.bond, {
                                  signed: false,
                                })}`,
                              )
                            }
                            onMouseLeave={() => setRebalanceHoverLabel(null)}
                          >
                            <title>
                              {`${t('dashboard.rebalanceTargetLabel')} ${t('dashboard.assetClassBond')} ${formatPercent(rebalancePlan.targets.bond, {
                                signed: false,
                              })}`}
                            </title>
                          </circle>
                        </svg>
                        <div className="relative z-10 text-center">
                          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                            {t('dashboard.rebalanceGapLabel')}
                          </p>
                          <p
                            className={`mt-2 text-3xl font-semibold ${
                              rebalancePlan.gaps.equity >= 0
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {formatPercentPoints(rebalancePlan.gaps.equity)}
                          </p>
                        </div>
                      </div>
                    </div>
                    {rebalanceHoverLabel ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                        {rebalanceHoverLabel}
                      </div>
                    ) : null}

                    <div className="mt-5 flex items-stretch gap-3">
                      <div
                        className={`h-20 overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-all duration-300 ${
                          isRebalanceTargetUnlocked
                            ? 'pointer-events-none max-w-0 flex-[0_0_0%] -translate-x-2 opacity-0'
                            : 'flex-1 opacity-100'
                        }`}
                      >
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                          {t('dashboard.rebalanceCurrentLabel')}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {`${formatPercent(rebalancePlan.current.equity, { signed: false })} ${t('dashboard.assetClassEquity')} / ${formatPercent(rebalancePlan.current.bond, { signed: false })} ${t('dashboard.assetClassBond')}`}
                        </p>
                      </div>

                      <div className="relative h-20 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                              {t('dashboard.rebalanceTargetLabel')}
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {`${rebalanceDraftEquityPercent}% ${t('dashboard.assetClassEquity')} / ${rebalanceDraftBondPercent}% ${t('dashboard.assetClassBond')}`}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleRebalanceTargetLockToggle}
                            aria-label={
                              isRebalanceTargetUnlocked
                                ? t('dashboard.rebalanceLockApplyLabel')
                                : t('dashboard.rebalanceLockEditLabel')
                            }
                            title={
                              isRebalanceTargetUnlocked
                                ? t('dashboard.rebalanceLockApplyLabel')
                                : t('dashboard.rebalanceLockEditLabel')
                            }
                            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
                              isRebalanceTargetUnlocked
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {isRebalanceTargetUnlocked ? <ApplyIcon /> : <LockIcon />}
                          </button>
                        </div>

                        <div
                          className={`absolute inset-x-4 bottom-3 overflow-hidden transition-all duration-300 ${
                            isRebalanceTargetUnlocked
                              ? 'max-h-16 translate-x-0 opacity-100'
                              : 'max-h-0 translate-x-4 opacity-0'
                          }`}
                        >
                          <label
                            htmlFor="rebalance-target-equity"
                            className="sr-only"
                          >
                            {t('dashboard.rebalanceTargetEquityLabel')}
                          </label>
                          <input
                            id="rebalance-target-equity"
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={rebalanceDraftEquityPercent}
                            onChange={(event) =>
                              setRebalanceDraftEquityPercent(Number(event.target.value))
                            }
                            disabled={!isRebalanceTargetUnlocked}
                            className={`h-3 w-full appearance-none rounded-full bg-transparent accent-slate-900 ${
                              isRebalanceTargetUnlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                            }`}
                            style={{
                              background: `linear-gradient(to right, #2563eb 0%, #2563eb ${rebalanceDraftEquityPercent}%, #14b8a6 ${rebalanceDraftEquityPercent}%, #14b8a6 100%)`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      {t('dashboard.rebalanceActionTitle')}
                    </p>
                    {rebalancePlan.totalRecommendedBuyAmount > 0 ? (
                      <>
                        <p className="mt-3 text-2xl font-semibold text-slate-900">
                          {formatCurrencyWithCode(
                            rebalancePlan.totalRecommendedBuyAmount,
                            locale,
                            displayCurrency,
                          )}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {t('dashboard.rebalanceActionDescription', {
                            amount: formatCurrencyWithCode(
                              rebalancePlan.totalRecommendedBuyAmount,
                              locale,
                              displayCurrency,
                            ),
                          })}
                        </p>
                        {rebalancePlan.notes.length ? (
                          <details className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <summary className="cursor-pointer list-none text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                              {t('dashboard.rebalanceFootnoteLabel')}
                            </summary>
                            <div className="mt-3 space-y-1 text-sm leading-6 text-slate-600">
                              {rebalancePlan.notes.map((note) => (
                                <p key={note}>{note}</p>
                              ))}
                            </div>
                          </details>
                        ) : null}
                        {displayedRebalanceSuggestions.length ? (
                          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-slate-200 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                              <p>{t('dashboard.rebalanceSuggestionAsset')}</p>
                              <p>{t('dashboard.rebalanceSuggestionPriceLabel')}</p>
                              <p>{t('dashboard.rebalanceSuggestionQuantityLabel')}</p>
                              <p>{t('dashboard.rebalanceSuggestionAmountLabel')}</p>
                            </div>
                            <div className="divide-y divide-slate-200">
                              {displayedRebalanceSuggestions.map((suggestion) => (
                                <div
                                  key={suggestion.assetId}
                                  className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-4 py-3"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900">
                                      {suggestion.symbol}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">
                                      {suggestion.name}
                                    </p>
                                  </div>
                                  <p className="text-sm text-slate-700">
                                    {suggestion.latestPrice != null
                                      ? formatCurrencyWithCode(
                                          suggestion.latestPrice,
                                          locale,
                                          suggestion.latestPriceCurrency,
                                        )
                                      : t('common.notAvailable')}
                                  </p>
                                  <div>
                                    <label
                                      htmlFor={`rebalance-quantity-${suggestion.assetId}`}
                                      className="sr-only"
                                    >
                                      {t('dashboard.rebalanceSuggestionQuantityInputLabel', {
                                        symbol: suggestion.symbol,
                                      })}
                                    </label>
                                    <input
                                      id={`rebalance-quantity-${suggestion.assetId}`}
                                      type="number"
                                      inputMode="decimal"
                                      min="0"
                                      step="0.01"
                                      value={rebalanceQuantityDrafts[suggestion.assetId] ?? suggestion.quantity.toFixed(2)}
                                      onChange={(event) =>
                                        handleRebalanceQuantityChange(
                                          suggestion.assetId,
                                          event.target.value,
                                        )
                                      }
                                      disabled={suggestion.latestPrice == null}
                                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                    />
                                  </div>
                                  <p className="text-sm font-medium text-slate-900">
                                    {formatCurrencyWithCode(
                                      suggestion.amount,
                                      locale,
                                      displayCurrency,
                                    )}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {rebalanceDraftPreview ? (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                              {t('dashboard.rebalanceDraftSummaryLabel')}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
                              <p>
                                {t('dashboard.rebalanceDraftSummaryTotal', {
                                  amount: formatCurrencyWithCode(
                                    rebalanceDraftPreview.totalAdded,
                                    locale,
                                    displayCurrency,
                                  ),
                                })}
                              </p>
                              <p>
                                {t('dashboard.rebalanceDraftSummaryMix', {
                                  equity: formatPercent(rebalanceDraftPreview.projectedEquity, {
                                    signed: false,
                                  }),
                                  bond: formatPercent(rebalanceDraftPreview.projectedBond, {
                                    signed: false,
                                  }),
                                })}
                              </p>
                              <p>
                                {t('dashboard.rebalanceDraftSummaryShift', {
                                  shift: formatPercentPoints(
                                    rebalanceDraftPreview.equityShift,
                                  ),
                                })}
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {t('dashboard.rebalanceNoActionNeeded')}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-600">
                  {t('dashboard.rebalanceEmptyState')}
                </div>
              )}
            </section>
          </section>

          <Suspense
            fallback={
              <ChartCardFallback
                title={t('dashboard.performanceTitle')}
                description={t('dashboard.performanceDescription')}
                heightClass="h-80"
              />
            }
          >
            <PerformanceChartCard
              title={t('dashboard.performanceTitle')}
              description={t('dashboard.performanceDescription')}
              badge={t('dashboard.assetCountBadge', { count: holdings.length })}
              data={performanceData}
              valueFormatter={(value) =>
                renderTooltipValue(value, locale, displayCurrency)
              }
              yAxisTickFormatter={(value) =>
                formatCompactCurrencyAxis(value, locale)
              }
            />
          </Suspense>

          <Suspense
            fallback={
              <ChartCardFallback
                title={t('dashboard.trendTitle')}
                description={t('dashboard.trendDescription')}
                heightClass="h-80"
              />
            }
          >
            <PortfolioTrendChartCard
              title={t('dashboard.trendTitle')}
              description={t('dashboard.trendDescription')}
              data={portfolioTrendData}
              valueFormatter={(value) =>
                renderTooltipValue(value, locale, displayCurrency)
              }
            />
          </Suspense>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">{t('dashboard.holdingsTitle')}</h2>
                <p className="text-sm text-gray-500">
                  {t('dashboard.holdingsDescription')}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="px-3 py-3 font-medium text-gray-600">
                        {t('dashboard.asset')}
                      </th>
                      <th className="px-3 py-3 font-medium text-gray-600">
                        {t('dashboard.weight')}
                      </th>
                      <th className="px-3 py-3 font-medium text-gray-600">
                        {t('dashboard.marketValue')}
                      </th>
                      <th className="px-3 py-3 font-medium text-gray-600">
                        {t('dashboard.totalPnl')}
                      </th>
                      <th className="px-3 py-3 font-medium text-gray-600">
                        {t('dashboard.totalReturn')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((holding) => {
                      const isSelected = holding.assetId === selectedHolding?.assetId

                      return (
                        <tr
                          key={holding.assetId}
                          onClick={() => setSelectedHoldingId(holding.assetId)}
                          className={`border-b border-gray-100 transition ${
                            isSelected ? 'bg-blue-50' : 'cursor-pointer hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-3 py-3">
                            <div className="font-medium text-gray-900">{holding.symbol}</div>
                            <div className="text-xs text-gray-500">{holding.name}</div>
                          </td>
                          <td className="px-3 py-3 text-gray-600">
                            {formatPercent(holding.weight, { signed: false })}
                          </td>
                          <td className="px-3 py-3 font-mono text-gray-700">
                            {formatCurrencyWithCode(
                              holding.marketValue,
                              locale,
                              displayCurrency,
                            )}
                          </td>
                          <td
                            className={`px-3 py-3 font-mono ${
                              holding.pnl >= 0 ? 'text-emerald-700' : 'text-red-600'
                            }`}
                          >
                            {formatSignedCurrency(holding.pnl, locale, displayCurrency)}
                          </td>
                          <td
                            className={`px-3 py-3 font-medium ${
                              holding.returnRate >= 0 ? 'text-emerald-700' : 'text-red-600'
                            }`}
                          >
                            {formatPercent(holding.returnRate)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedHolding ? (
              <aside className="space-y-6">
                <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-gray-500">
                        {formatHoldingType(selectedHolding.type, t)}
                      </p>
                      <h2 className="mt-2 text-3xl font-semibold text-gray-950">
                        {selectedHolding.symbol}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">{selectedHolding.name}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {formatPercent(selectedHolding.weight, { signed: false })}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                        {t('dashboard.quantity')}
                      </p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">
                        {formatCurrency(selectedHolding.quantity, locale)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                        {t('dashboard.avgCost')}
                      </p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">
                        {formatCurrencyWithCode(
                          selectedHolding.avgCost,
                          locale,
                          displayCurrency,
                        )}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                        {t('dashboard.latestPrice')}
                      </p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">
                        {selectedHolding.latestPrice == null
                          ? t('common.notAvailable')
                          : formatCurrencyWithCode(
                              selectedHolding.latestPrice,
                              locale,
                              getHoldingLatestPriceCurrency(selectedHolding),
                            )}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        {t('dashboard.latestPriceHint')}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                        {t('dashboard.assetClassLabel')}
                      </p>
                      <p className="mt-2 text-sm font-medium text-gray-900">
                        {formatHoldingAssetClass(selectedHolding.assetClass, t)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                        {t('dashboard.lastActivity')}
                      </p>
                      <p className="mt-2 text-sm font-medium text-gray-900">
                        {selectedHolding.lastActivitySummary ?? t('dashboard.noRecentActivity')}
                      </p>
                    </div>
                  </div>
                </section>

                {selectedTrendErrorMessage ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {selectedTrendErrorMessage}
                  </div>
                ) : null}

                <Suspense
                  fallback={
                    <ChartCardFallback
                      title={t('dashboard.selectedTrendTitle')}
                      description={t('dashboard.selectedTrendDescription')}
                      heightClass="h-56"
                    />
                  }
                >
                  <HoldingTrendChartCard
                    title={t('dashboard.selectedTrendTitle')}
                    description={t('dashboard.selectedTrendDescription')}
                    data={selectedHoldingTrendData}
                    valueFormatter={(value) =>
                      renderTooltipValue(value, locale, displayCurrency)
                    }
                  />
                </Suspense>

                <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                        {t('dashboard.investedAmount')}
                      </p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">
                        {formatCurrencyWithCode(
                          selectedHolding.investedAmount,
                          locale,
                          displayCurrency,
                        )}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                        {t('dashboard.marketValue')}
                      </p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">
                        {formatCurrencyWithCode(
                          selectedHolding.marketValue,
                          locale,
                          displayCurrency,
                        )}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold">{t('dashboard.allocationTitle')}</h2>
                    <p className="text-sm text-gray-500">
                      {t('dashboard.selectedTrendDescription')}
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {selectedHoldingAllocation.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium text-gray-800">{item.label}</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {formatCurrencyWithCode(item.value, locale, displayCurrency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </aside>
            ) : null}
          </section>
        </>
      )}
    </div>
  )
}
