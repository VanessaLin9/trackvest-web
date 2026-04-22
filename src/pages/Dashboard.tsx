import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useAuthenticatedUser } from '../app/use-auth'
import type {
  AllocationChartItem,
  PerformanceDatum,
  TrendPoint,
} from '../components/dashboard/PortfolioCharts'
import { ChartCardFallback } from '../components/dashboard/ChartCardFallback'
import { DashboardHero } from '../components/dashboard/DashboardHero'
import { DashboardLoadingState } from '../components/dashboard/DashboardLoadingState'
import { HoldingsTable } from '../components/dashboard/HoldingsTable'
import { KpiCards } from '../components/dashboard/KpiCards'
import { RebalancePanel } from '../components/dashboard/RebalancePanel'
import { SelectedHoldingAside } from '../components/dashboard/SelectedHoldingAside'
import { formatAllocationLabel } from '../components/dashboard/allocation-label'
import { renderTooltipValue } from '../components/dashboard/chart-helpers'
import { useI18n } from '../i18n'
import { portfolioService } from '../lib/portfolio.service'
import {
  usePreferencesStore,
  type AllocationViewMode,
} from '../store/preferences'
import { fxService } from '../lib/fx.service'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { getApiErrorMessage } from '../lib/errors'
import { formatCompactCurrencyAxis } from '../lib/formatters'
import { queryKeys, resolveDisplayCurrencyKey } from '../lib/query-keys'
import {
  chartColors,
  PORTFOLIO_PALETTE,
  getAllocationColor,
  getPnlColor,
} from '../theme/chart-tokens'

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
export default function Dashboard() {
  const currentUserId = useAuthenticatedUser().id
  const { t, locale } = useI18n()
  const [selectedHoldingId, setSelectedHoldingId] = useState<string | null>(null)
  const {
    displayCurrencyMode,
    preferredBaseCurrency,
    allocationViewMode,
    setAllocationViewMode,
  } = usePreferencesStore()
  const requestedDisplayCurrency =
    displayCurrencyMode === 'base' ? preferredBaseCurrency : undefined
  const displayCurrencyKey = resolveDisplayCurrencyKey(requestedDisplayCurrency)

  const summaryQuery = useQuery({
    queryKey: queryKeys.portfolio.summary(currentUserId, displayCurrencyKey),
    queryFn: () =>
      portfolioService.getSummary(
        requestedDisplayCurrency
          ? { preferredBaseCurrency: requestedDisplayCurrency }
          : undefined,
      ),
    enabled: Boolean(currentUserId),
  })

  const fxRateQuery = useQuery({
    queryKey: queryKeys.fx.todayRate('USD', 'TWD'),
    queryFn: () => fxService.getTodayRate({ base: 'USD', quote: 'TWD' }),
    enabled: Boolean(currentUserId),
  })

  const holdingsQuery = useQuery({
    queryKey: queryKeys.portfolio.holdings(currentUserId, displayCurrencyKey),
    queryFn: () =>
      portfolioService.getHoldings(
        requestedDisplayCurrency
          ? { preferredBaseCurrency: requestedDisplayCurrency }
          : undefined,
      ),
    enabled: Boolean(currentUserId),
  })

  const trendQuery = useQuery({
    queryKey: queryKeys.portfolio.trend(currentUserId, displayCurrencyKey),
    queryFn: () =>
      portfolioService.getTrend(
        requestedDisplayCurrency
          ? { preferredBaseCurrency: requestedDisplayCurrency }
          : undefined,
      ),
    enabled: Boolean(currentUserId),
  })

  const holdings = useMemo(
    () => holdingsQuery.data?.items ?? [],
    [holdingsQuery.data],
  )
  const summary = summaryQuery.data
  const displayCurrency =
    summary?.effectiveDisplayCurrency ??
    holdingsQuery.data?.effectiveDisplayCurrency ??
    trendQuery.data?.effectiveDisplayCurrency ??
    summary?.baseCurrency ??
    null

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
    queryKey: queryKeys.portfolio.holdingTrend(
      currentUserId,
      selectedHolding?.assetId,
      displayCurrencyKey,
    ),
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
          ? getPnlColor(holding.pnl) || PORTFOLIO_PALETTE[index % PORTFOLIO_PALETTE.length]
          : PORTFOLIO_PALETTE[index % PORTFOLIO_PALETTE.length],
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
          color: chartColors.equity,
        },
        {
          id: 'costBasis',
          label: formatAllocationLabel('costBasis', 'Cost basis', t),
          value: selectedHolding.investedAmount,
          color: chartColors.costBasis,
        },
      ]
    },
    [selectedHolding, t],
  )

  const overviewErrorMessage = useMemo(() => {
    const error = summaryQuery.error ?? holdingsQuery.error ?? trendQuery.error ?? null
    return error ? getApiErrorMessage(error, t('dashboard.failedToLoad')) : null
  }, [holdingsQuery.error, summaryQuery.error, t, trendQuery.error])

  const selectedTrendErrorMessage = useMemo(() => {
    if (!holdingTrendQuery.error) {
      return null
    }

    return getApiErrorMessage(holdingTrendQuery.error, t('dashboard.failedToLoad'))
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
      <DashboardHero
        summary={summary}
        displayCurrency={displayCurrency}
        fxRateQuery={fxRateQuery}
      />

      {overviewErrorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {overviewErrorMessage}
        </div>
      ) : null}

      <KpiCards summary={summary} displayCurrency={displayCurrency} />

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
                      <SegmentedControl
                        value={effectiveAllocationViewMode}
                        onChange={setAllocationViewMode}
                        options={[
                          {
                            value: 'assetClass',
                            label: t('dashboard.allocationViewAssetClass'),
                          },
                          {
                            value: 'type',
                            label: t('dashboard.allocationViewType'),
                          },
                        ]}
                      />
                    </div>
                  ) : null
                }
              />
            </Suspense>

            <RebalancePanel
              currentUserId={currentUserId}
              displayCurrency={displayCurrency}
              requestedDisplayCurrency={requestedDisplayCurrency}
            />
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
            <HoldingsTable
              holdings={holdings}
              selectedHoldingId={selectedHolding?.assetId ?? null}
              onSelectHolding={setSelectedHoldingId}
              displayCurrency={displayCurrency}
            />

            {selectedHolding ? (
              <SelectedHoldingAside
                holding={selectedHolding}
                displayCurrency={displayCurrency}
                trendData={selectedHoldingTrendData}
                allocation={selectedHoldingAllocation}
                trendErrorMessage={selectedTrendErrorMessage}
              />
            ) : null}
          </section>
        </>
      )}
    </div>
  )
}
