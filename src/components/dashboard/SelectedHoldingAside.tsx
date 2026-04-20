import { lazy, Suspense } from 'react'
import { useI18n } from '../../i18n'
import {
  formatCurrency,
  formatCurrencyWithCode,
  formatPercent,
} from '../../lib/formatters'
import { formatAssetClass, formatAssetType } from '../../lib/labels'
import type { PortfolioHolding } from '../../lib/portfolio.service'
import { Card } from '../ui/Card'
import { ChartCardFallback } from './ChartCardFallback'
import { getHoldingLatestPriceCurrency, renderTooltipValue } from './chart-helpers'
import type { AllocationChartItem, TrendPoint } from './PortfolioCharts'

const HoldingTrendChartCard = lazy(() =>
  import('./PortfolioCharts').then((module) => ({
    default: module.HoldingTrendChartCard,
  })),
)

interface SelectedHoldingAsideProps {
  holding: PortfolioHolding
  displayCurrency: string | null
  trendData: TrendPoint[]
  allocation: AllocationChartItem[]
  trendErrorMessage: string | null
}

/**
 * Right-hand detail aside shown when a row in the holdings table is
 * selected. Composed of three cards (metric summary + trend chart + cost
 * vs market-value + per-holding allocation) plus an optional error
 * banner for the trend query.
 *
 * The lazy-loaded `HoldingTrendChartCard` is imported locally so this
 * file owns its only usage — if the aside is never rendered (no
 * selection), the chart bundle is never fetched.
 */
export function SelectedHoldingAside({
  holding,
  displayCurrency,
  trendData,
  allocation,
  trendErrorMessage,
}: SelectedHoldingAsideProps) {
  const { t, locale } = useI18n()

  return (
    <aside className="space-y-6">
      <Card as="section">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-gray-500">
              {formatAssetType(holding.type, t)}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-gray-950">
              {holding.symbol}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{holding.name}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {formatPercent(holding.weight, { signed: false })}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-gray-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
              {t('dashboard.quantity')}
            </p>
            <p className="mt-2 text-xl font-semibold text-gray-900">
              {formatCurrency(holding.quantity, locale)}
            </p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
              {t('dashboard.avgCost')}
            </p>
            <p className="mt-2 text-xl font-semibold text-gray-900">
              {formatCurrencyWithCode(holding.avgCost, locale, displayCurrency)}
            </p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
              {t('dashboard.latestPrice')}
            </p>
            <p className="mt-2 text-xl font-semibold text-gray-900">
              {holding.latestPrice == null
                ? t('common.notAvailable')
                : formatCurrencyWithCode(
                    holding.latestPrice,
                    locale,
                    getHoldingLatestPriceCurrency(holding),
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
              {formatAssetClass(holding.assetClass, t)}
            </p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
              {t('dashboard.lastActivity')}
            </p>
            <p className="mt-2 text-sm font-medium text-gray-900">
              {holding.lastActivitySummary ?? t('dashboard.noRecentActivity')}
            </p>
          </div>
        </div>
      </Card>

      {trendErrorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {trendErrorMessage}
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
          data={trendData}
          valueFormatter={(value) =>
            renderTooltipValue(value, locale, displayCurrency)
          }
        />
      </Suspense>

      <Card as="section">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
              {t('dashboard.investedAmount')}
            </p>
            <p className="mt-2 text-xl font-semibold text-gray-900">
              {formatCurrencyWithCode(
                holding.investedAmount,
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
                holding.marketValue,
                locale,
                displayCurrency,
              )}
            </p>
          </div>
        </div>
      </Card>

      <Card as="section">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{t('dashboard.allocationTitle')}</h2>
          <p className="text-sm text-gray-500">
            {t('dashboard.selectedTrendDescription')}
          </p>
        </div>

        <div className="grid gap-3">
          {allocation.map((item) => (
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
      </Card>
    </aside>
  )
}
