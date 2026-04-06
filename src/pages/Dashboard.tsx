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
  type PortfolioHolding,
} from '../lib/portfolio.service'

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

function formatPercent(
  value: number,
  options: { signed?: boolean } = {},
) {
  const { signed = true } = options
  const prefix =
    signed && value > 0 ? '+' : signed && value < 0 ? '-' : ''

  return `${prefix}${(Math.abs(value) * 100).toFixed(2)}%`
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

function formatAllocationLabel(
  id: string,
  fallback: string,
  t: (key: string) => string,
) {
  switch (id) {
    case 'equity':
      return t('assets.typeEquity')
    case 'etf':
      return t('assets.typeEtf')
    case 'crypto':
      return t('assets.typeCrypto')
    case 'cash':
      return t('assets.typeCash')
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
    case 'etf':
      return '#0f766e'
    case 'crypto':
      return '#f59e0b'
    case 'cash':
      return '#9333ea'
    default:
      return '#94a3b8'
  }
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

export default function Dashboard() {
  const currentUserId = useCurrentUserId()
  const { t, locale } = useI18n()
  const [selectedHoldingId, setSelectedHoldingId] = useState<string | null>(null)

  const summaryQuery = useQuery({
    queryKey: ['portfolio', 'summary', currentUserId],
    queryFn: () => portfolioService.getSummary(),
    enabled: Boolean(currentUserId),
  })

  const holdingsQuery = useQuery({
    queryKey: ['portfolio', 'holdings', currentUserId],
    queryFn: () => portfolioService.getHoldings(),
    enabled: Boolean(currentUserId),
  })

  const trendQuery = useQuery({
    queryKey: ['portfolio', 'trend', currentUserId],
    queryFn: () => portfolioService.getTrend(),
    enabled: Boolean(currentUserId),
  })

  const holdings = holdingsQuery.data?.items ?? []
  const summary = summaryQuery.data
  const displayCurrency = summary?.baseCurrency ?? null
  const hasMixedCurrencyPortfolio = Boolean(summary && summary.baseCurrency == null && holdings.length > 0)

  useEffect(() => {
    setSelectedHoldingId((current) =>
      current && holdings.some((holding) => holding.assetId === current)
        ? current
        : holdings[0]?.assetId ?? null,
    )
  }, [holdings])

  const selectedHolding = useMemo(
    () => holdings.find((holding) => holding.assetId === selectedHoldingId) ?? null,
    [holdings, selectedHoldingId],
  )

  const holdingTrendQuery = useQuery({
    queryKey: ['portfolio', 'holding-trend', currentUserId, selectedHolding?.assetId],
    queryFn: () => portfolioService.getHoldingTrend(selectedHolding!.assetId),
    enabled: Boolean(currentUserId && selectedHolding?.assetId),
  })

  const allocationChartData = useMemo<AllocationChartItem[]>(
    () =>
      (holdingsQuery.data?.allocationByType ?? []).map((item) => ({
        id: item.type,
        label: formatAllocationLabel(item.type, item.type, t),
        value: Number((item.weight * 100).toFixed(2)),
        color: getAllocationColor(item.type),
      })),
    [holdingsQuery.data?.allocationByType, t],
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
        </div>
      </section>

      {overviewErrorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {overviewErrorMessage}
        </div>
      ) : null}

      {hasMixedCurrencyPortfolio ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-950">
            {t('dashboard.mixedCurrencyNoticeTitle')}
          </p>
          <p className="mt-1 text-sm text-amber-900/85">
            {t('dashboard.mixedCurrencyNoticeBody')}
          </p>
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
                description={t('dashboard.allocationDescription')}
                data={allocationChartData}
              />
            </Suspense>

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
              />
            </Suspense>
          </section>

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
                              displayCurrency,
                            )}
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
