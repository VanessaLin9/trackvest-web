import { lazy, Suspense, useMemo, useState } from 'react'
import { useCurrentUserId } from '../app/current-user'
import { useI18n } from '../i18n'
import type {
  AllocationChartItem,
  ChartValue,
  PerformanceDatum,
  TrendPoint,
} from '../components/dashboard/PortfolioCharts'

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

type Holding = {
  id: string
  symbol: string
  name: string
  type: 'equity' | 'etf' | 'crypto'
  quantity: number
  avgCost: number
  latestPrice: number
  investedAmount: number
  marketValue: number
  pnl: number
  returnRate: number
  weight: number
  noteKey: string
  latestActivityKey: string
  allocation: AllocationChartItem[]
  history: TrendPoint[]
}

const PORTFOLIO_COLORS = ['#0f766e', '#2563eb', '#f59e0b', '#9333ea', '#ef4444']

const PORTFOLIO_SUMMARY = {
  investedCapital: 1524300,
  marketValue: 1689800,
  totalPnl: 165500,
  totalReturnRate: 10.86,
  holdingsCount: 5,
}

const PORTFOLIO_ALLOCATION: AllocationChartItem[] = [
  { id: 'equity', label: 'Equity', value: 47, color: '#2563eb' },
  { id: 'etf', label: 'ETF', value: 31, color: '#0f766e' },
  { id: 'crypto', label: 'Crypto', value: 14, color: '#f59e0b' },
  { id: 'cash', label: 'Cash', value: 8, color: '#9333ea' },
]

const PORTFOLIO_TREND: TrendPoint[] = [
  { label: 'Nov', invested: 1020000, marketValue: 1045000 },
  { label: 'Dec', invested: 1163000, marketValue: 1218000 },
  { label: 'Jan', invested: 1295000, marketValue: 1342000 },
  { label: 'Feb', invested: 1384000, marketValue: 1496000 },
  { label: 'Mar', invested: 1468000, marketValue: 1609000 },
  { label: 'Apr', invested: 1524300, marketValue: 1689800 },
]

const HOLDINGS: Holding[] = [
  {
    id: '2330',
    symbol: '2330',
    name: 'TSMC',
    type: 'equity',
    quantity: 120,
    avgCost: 812.5,
    latestPrice: 892,
    investedAmount: 975000,
    marketValue: 1070400,
    pnl: 95400,
    returnRate: 9.78,
    weight: 63.3,
    noteKey: 'dashboard.asset2330Note',
    latestActivityKey: 'dashboard.asset2330Activity',
    allocation: [
      { id: 'stock', label: 'Current value', value: 1070400, color: '#2563eb' },
      { id: 'cost', label: 'Cost basis', value: 975000, color: '#cbd5e1' },
    ],
    history: [
      { label: 'Nov', invested: 820000, marketValue: 828000 },
      { label: 'Dec', invested: 860000, marketValue: 904000 },
      { label: 'Jan', invested: 905000, marketValue: 958000 },
      { label: 'Feb', invested: 930000, marketValue: 1008000 },
      { label: 'Mar', invested: 960000, marketValue: 1035000 },
      { label: 'Apr', invested: 975000, marketValue: 1070400 },
    ],
  },
  {
    id: '0050',
    symbol: '0050',
    name: 'Taiwan Top 50 ETF',
    type: 'etf',
    quantity: 340,
    avgCost: 161.2,
    latestPrice: 173.8,
    investedAmount: 54808,
    marketValue: 59092,
    pnl: 4284,
    returnRate: 7.82,
    weight: 3.5,
    noteKey: 'dashboard.asset0050Note',
    latestActivityKey: 'dashboard.asset0050Activity',
    allocation: [
      { id: 'stock', label: 'Current value', value: 59092, color: '#0f766e' },
      { id: 'cost', label: 'Cost basis', value: 54808, color: '#cbd5e1' },
    ],
    history: [
      { label: 'Nov', invested: 42000, marketValue: 42900 },
      { label: 'Dec', invested: 45000, marketValue: 46300 },
      { label: 'Jan', invested: 48600, marketValue: 50200 },
      { label: 'Feb', invested: 51400, marketValue: 54400 },
      { label: 'Mar', invested: 53400, marketValue: 56800 },
      { label: 'Apr', invested: 54808, marketValue: 59092 },
    ],
  },
  {
    id: 'AAPL',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'equity',
    quantity: 32,
    avgCost: 183.1,
    latestPrice: 196.2,
    investedAmount: 5859,
    marketValue: 6278,
    pnl: 419,
    returnRate: 7.15,
    weight: 0.4,
    noteKey: 'dashboard.assetAaplNote',
    latestActivityKey: 'dashboard.assetAaplActivity',
    allocation: [
      { id: 'stock', label: 'Current value', value: 6278, color: '#1d4ed8' },
      { id: 'cost', label: 'Cost basis', value: 5859, color: '#cbd5e1' },
    ],
    history: [
      { label: 'Nov', invested: 4200, marketValue: 4380 },
      { label: 'Dec', invested: 4700, marketValue: 4920 },
      { label: 'Jan', invested: 5300, marketValue: 5480 },
      { label: 'Feb', invested: 5600, marketValue: 5790 },
      { label: 'Mar', invested: 5780, marketValue: 6030 },
      { label: 'Apr', invested: 5859, marketValue: 6278 },
    ],
  },
  {
    id: 'BTC',
    symbol: 'BTC',
    name: 'Bitcoin',
    type: 'crypto',
    quantity: 0.42,
    avgCost: 1460000,
    latestPrice: 1820000,
    investedAmount: 613200,
    marketValue: 764400,
    pnl: 151200,
    returnRate: 24.66,
    weight: 45.2,
    noteKey: 'dashboard.assetBtcNote',
    latestActivityKey: 'dashboard.assetBtcActivity',
    allocation: [
      { id: 'stock', label: 'Current value', value: 764400, color: '#f59e0b' },
      { id: 'cost', label: 'Cost basis', value: 613200, color: '#cbd5e1' },
    ],
    history: [
      { label: 'Nov', invested: 320000, marketValue: 341000 },
      { label: 'Dec', invested: 390000, marketValue: 430000 },
      { label: 'Jan', invested: 470000, marketValue: 540000 },
      { label: 'Feb', invested: 560000, marketValue: 635000 },
      { label: 'Mar', invested: 602000, marketValue: 708000 },
      { label: 'Apr', invested: 613200, marketValue: 764400 },
    ],
  },
  {
    id: 'QQQ',
    symbol: 'QQQ',
    name: 'Invesco QQQ ETF',
    type: 'etf',
    quantity: 18,
    avgCost: 432.4,
    latestPrice: 441.8,
    investedAmount: 7783,
    marketValue: 7952,
    pnl: 169,
    returnRate: 2.17,
    weight: 0.5,
    noteKey: 'dashboard.assetQqqNote',
    latestActivityKey: 'dashboard.assetQqqActivity',
    allocation: [
      { id: 'stock', label: 'Current value', value: 7952, color: '#14b8a6' },
      { id: 'cost', label: 'Cost basis', value: 7783, color: '#cbd5e1' },
    ],
    history: [
      { label: 'Nov', invested: 6400, marketValue: 6510 },
      { label: 'Dec', invested: 6800, marketValue: 6920 },
      { label: 'Jan', invested: 7200, marketValue: 7370 },
      { label: 'Feb', invested: 7440, marketValue: 7600 },
      { label: 'Mar', invested: 7650, marketValue: 7810 },
      { label: 'Apr', invested: 7783, marketValue: 7952 },
    ],
  },
]

function formatCurrency(value: number, locale: string) {
  return value.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function formatCurrencyWithCode(value: number, locale: string, currency = 'TWD') {
  return `${formatCurrency(value, locale)} ${currency}`
}

function formatSignedCurrency(value: number, locale: string, currency = 'TWD') {
  const prefix = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${prefix}${formatCurrency(Math.abs(value), locale)} ${currency}`
}

function formatPercent(value: number) {
  const prefix = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${prefix}${Math.abs(value).toFixed(2)}%`
}

function formatHoldingType(
  type: Holding['type'],
  t: (key: string) => string,
) {
  switch (type) {
    case 'equity':
      return t('assets.typeEquity')
    case 'etf':
      return t('assets.typeEtf')
    case 'crypto':
      return t('assets.typeCrypto')
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
    case 'stock':
      return t('dashboard.marketValue')
    case 'cost':
      return t('dashboard.costBasis')
    default:
      return fallback
  }
}

function renderTooltipValue(value: ChartValue, locale: string): string {
  if (value === undefined) {
    return ''
  }

  if (Array.isArray(value)) {
    return value.join(' / ')
  }

  if (typeof value !== 'number') {
    return String(value)
  }

  return formatCurrencyWithCode(value, locale)
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

export default function Dashboard() {
  const currentUserId = useCurrentUserId()
  const { t, locale } = useI18n()
  const [selectedHoldingId, setSelectedHoldingId] = useState(HOLDINGS[0]?.id ?? '')

  const selectedHolding = useMemo(
    () => HOLDINGS.find((holding) => holding.id === selectedHoldingId) ?? HOLDINGS[0],
    [selectedHoldingId],
  )

  const performanceData = useMemo<PerformanceDatum[]>(
    () =>
      HOLDINGS.map((holding, index) => ({
        symbol: holding.symbol,
        pnl: holding.pnl,
        color: PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length],
      })),
    [],
  )

  const allocationChartData = useMemo(
    () =>
      PORTFOLIO_ALLOCATION.map((item) => ({
        ...item,
        label: formatAllocationLabel(item.id, item.label, t),
      })),
    [t],
  )

  if (!currentUserId) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-3xl font-semibold">{t('dashboard.title')}</h1>
        <p className="text-red-600">
          {t('common.envDemoUserMissing')}
        </p>
      </div>
    )
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
                {formatSignedCurrency(PORTFOLIO_SUMMARY.totalPnl, locale)}
              </p>
              <p className="mt-2 text-sm text-slate-200">
                {t('dashboard.mockDataNotice')}
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
                {PORTFOLIO_SUMMARY.holdingsCount}
              </p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                {t('dashboard.totalReturn')}
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">
                {formatPercent(PORTFOLIO_SUMMARY.totalReturnRate)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">{t('dashboard.investedCapital')}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatCurrency(PORTFOLIO_SUMMARY.investedCapital, locale)}
          </p>
          <p className="mt-2 text-xs text-gray-500">{t('dashboard.investedCapitalHint')}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">{t('dashboard.marketValue')}</p>
          <p className="mt-3 text-3xl font-semibold text-blue-700">
            {formatCurrency(PORTFOLIO_SUMMARY.marketValue, locale)}
          </p>
          <p className="mt-2 text-xs text-gray-500">{t('dashboard.marketValueHint')}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">{t('dashboard.totalPnl')}</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-700">
            {formatSignedCurrency(PORTFOLIO_SUMMARY.totalPnl, locale)}
          </p>
          <p className="mt-2 text-xs text-gray-500">{t('dashboard.pnlDescription')}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">{t('dashboard.totalReturn')}</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-700">
            {formatPercent(PORTFOLIO_SUMMARY.totalReturnRate)}
          </p>
          <p className="mt-2 text-xs text-gray-500">{t('dashboard.returnDescription')}</p>
        </div>
      </section>

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
            badge={t('dashboard.assetCountBadge', { count: HOLDINGS.length })}
            data={performanceData}
            valueFormatter={(value) => renderTooltipValue(value, locale)}
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
          data={PORTFOLIO_TREND}
          valueFormatter={(value) => renderTooltipValue(value, locale)}
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
                  <th className="px-3 py-3 font-medium text-gray-600">{t('dashboard.asset')}</th>
                  <th className="px-3 py-3 font-medium text-gray-600">{t('dashboard.weight')}</th>
                  <th className="px-3 py-3 font-medium text-gray-600">{t('dashboard.marketValue')}</th>
                  <th className="px-3 py-3 font-medium text-gray-600">{t('dashboard.totalPnl')}</th>
                  <th className="px-3 py-3 font-medium text-gray-600">{t('dashboard.totalReturn')}</th>
                </tr>
              </thead>
              <tbody>
                {HOLDINGS.map((holding) => {
                  const isSelected = holding.id === selectedHolding.id

                  return (
                    <tr
                      key={holding.id}
                      onClick={() => setSelectedHoldingId(holding.id)}
                      className={`border-b border-gray-100 transition ${
                        isSelected ? 'bg-blue-50' : 'cursor-pointer hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900">{holding.symbol}</div>
                        <div className="text-xs text-gray-500">{holding.name}</div>
                      </td>
                      <td className="px-3 py-3 text-gray-600">{holding.weight.toFixed(1)}%</td>
                      <td className="px-3 py-3 font-mono text-gray-700">
                        {formatCurrencyWithCode(holding.marketValue, locale)}
                      </td>
                      <td
                        className={`px-3 py-3 font-mono ${
                          holding.pnl >= 0 ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {formatSignedCurrency(holding.pnl, locale)}
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
                {selectedHolding.weight.toFixed(1)}%
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  {t('dashboard.quantity')}
                </p>
                <p className="mt-2 text-xl font-semibold text-gray-900">
                  {selectedHolding.quantity}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  {t('dashboard.avgCost')}
                </p>
                <p className="mt-2 text-xl font-semibold text-gray-900">
                  {formatCurrencyWithCode(selectedHolding.avgCost, locale)}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  {t('dashboard.latestPrice')}
                </p>
                <p className="mt-2 text-xl font-semibold text-gray-900">
                  {formatCurrencyWithCode(selectedHolding.latestPrice, locale)}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  {t('dashboard.lastActivity')}
                </p>
                <p className="mt-2 text-sm font-medium text-gray-900">
                  {t(selectedHolding.latestActivityKey)}
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-gray-600">
              {t(selectedHolding.noteKey)}
            </p>
          </section>

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
              data={selectedHolding.history}
              valueFormatter={(value) => renderTooltipValue(value, locale)}
            />
          </Suspense>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mt-0 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  {t('dashboard.investedAmount')}
                </p>
                <p className="mt-2 text-xl font-semibold text-gray-900">
                  {formatCurrencyWithCode(selectedHolding.investedAmount, locale)}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  {t('dashboard.marketValue')}
                </p>
                <p className="mt-2 text-xl font-semibold text-gray-900">
                  {formatCurrencyWithCode(selectedHolding.marketValue, locale)}
                </p>
              </div>
            </div>
          </section>
        </aside>
      </section>

      <section className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-5">
        <h2 className="text-lg font-semibold">{t('dashboard.apiPlanningTitle')}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-medium text-slate-900">`GET /portfolio/summary`</p>
            <p className="mt-2 text-sm text-gray-600">
              {t('dashboard.apiPlanningSummary')}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-medium text-slate-900">`GET /portfolio/holdings`</p>
            <p className="mt-2 text-sm text-gray-600">
              {t('dashboard.apiPlanningHoldings')}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-medium text-slate-900">`GET /portfolio/trend`</p>
            <p className="mt-2 text-sm text-gray-600">
              {t('dashboard.apiPlanningTrend')}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
