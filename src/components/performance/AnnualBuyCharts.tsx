import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useI18n } from '../../i18n'
import {
  ANNUAL_BUY_TYPES,
  formatBuyMonth,
  formatSharePercent,
  monthsAsReturned,
  type AnnualBuyYearPoint,
  type PortfolioAnnualBuyAssetType,
  type PortfolioAnnualBuyItem,
} from '../../lib/annual-buys'
import {
  formatCompactCurrencyAxis,
  formatExactDecimalAmount,
  parseDecimalString,
} from '../../lib/formatters'
import { chartColors } from '../../theme/chart-tokens'

const TYPE_COLORS: Record<PortfolioAnnualBuyAssetType, string> = {
  equity: chartColors.equity,
  etf: chartColors.etf,
  crypto: chartColors.crypto,
  cash: chartColors.cash,
  other: chartColors.neutral,
}

type AmountChartProps = {
  points: AnnualBuyYearPoint[]
  currency: string
}

type MonthChartProps = {
  item: PortfolioAnnualBuyItem
  currency: string
}

function typeLabelKey(type: PortfolioAnnualBuyAssetType) {
  if (type === 'equity') return 'performance.annualBuyTypeEquity'
  if (type === 'etf') return 'performance.annualBuyTypeEtf'
  if (type === 'crypto') return 'performance.annualBuyTypeCrypto'
  if (type === 'cash') return 'performance.annualBuyTypeCash'
  return 'performance.annualBuyTypeOther'
}

function presentTypes(points: AnnualBuyYearPoint[]): PortfolioAnnualBuyAssetType[] {
  return ANNUAL_BUY_TYPES.filter((type) =>
    points.some((point) => point.types[type].buyAmount != null),
  )
}

export function AnnualBuyAmountChart({ points, currency }: AmountChartProps) {
  const { t, locale } = useI18n()
  const types = presentTypes(points)
  const data = points.map((point) => ({
    year: point.year,
    ...Object.fromEntries(types.map((type) => [type, point.types[type].chartAmount])),
  }))

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-800">
        {t('performance.annualBuyAmountHeading')}
      </h3>
      <ol className="sr-only" aria-label={t('performance.annualBuyAmountChart')}>
        {points.map((point) => (
          <li key={point.year}>
            {point.isCurrentYear
              ? `${point.year} ${t('performance.annualYearToDate')}`
              : point.year}
            {': '}
            {formatExactDecimalAmount(point.buyAmount, locale, currency)}
          </li>
        ))}
      </ol>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.gridStrokeAlt} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCompactCurrencyAxis(value, locale)}
            />
            <Tooltip
              formatter={(value, name, item) => {
                const year = Number(
                  (item as { payload?: { year?: number } }).payload?.year,
                )
                const type = String(name) as PortfolioAnnualBuyAssetType
                const amount = points.find((entry) => entry.year === year)?.types[type]
                  ?.buyAmount
                void value
                return [
                  amount == null
                    ? t('performance.annualBuyNoType')
                    : formatExactDecimalAmount(amount, locale, currency),
                  t(typeLabelKey(type)),
                ]
              }}
            />
            <Legend formatter={(value) => t(typeLabelKey(value as PortfolioAnnualBuyAssetType))} />
            {types.map((type) => (
              <Bar key={type} dataKey={type} stackId="amount" fill={TYPE_COLORS[type]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function AnnualBuyShareChart({ points }: { points: AnnualBuyYearPoint[] }) {
  const { t } = useI18n()
  const types = presentTypes(points)
  const data = points.map((point) => ({
    year: point.year,
    ...Object.fromEntries(
      types.map((type) => [type, point.types[type].chartShare * 100]),
    ),
  }))

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-800">
        {t('performance.annualBuyShareHeading')}
      </h3>
      <ol className="sr-only" aria-label={t('performance.annualBuyShareChart')}>
        {points.map((point) => (
          <li key={point.year}>
            {point.year}
            {': '}
            {types
              .map((type) => {
                const share = formatSharePercent(point.types[type].share)
                return share ? `${t(typeLabelKey(type))} ${share}` : null
              })
              .filter(Boolean)
              .join(', ')}
          </li>
        ))}
      </ol>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.gridStrokeAlt} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} unit="%" />
            <Tooltip
              formatter={(value, name, item) => {
                const year = Number(
                  (item as { payload?: { year?: number } }).payload?.year,
                )
                const type = String(name) as PortfolioAnnualBuyAssetType
                const share = formatSharePercent(
                  points.find((entry) => entry.year === year)?.types[type]?.share,
                )
                void value
                return [share ?? t('performance.annualBuyNoType'), t(typeLabelKey(type))]
              }}
            />
            <Legend formatter={(value) => t(typeLabelKey(value as PortfolioAnnualBuyAssetType))} />
            {types.map((type) => (
              <Bar key={type} dataKey={type} stackId="share" fill={TYPE_COLORS[type]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function AnnualBuyMonthChart({ item, currency }: MonthChartProps) {
  const { t, locale } = useI18n()
  const months = monthsAsReturned(item)
  const types = ANNUAL_BUY_TYPES.filter((type) =>
    months.some((month) => month.types.some((entry) => entry.type === type)),
  )
  const data = months.map((month) => {
    const byType = new Map(month.types.map((entry) => [entry.type, entry]))
    return {
      month: formatBuyMonth(month.month, locale),
      ...Object.fromEntries(
        types.map((type) => [type, parseDecimalString(byType.get(type)?.buyAmount) ?? 0]),
      ),
    }
  })

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-800">
        {t('performance.annualBuyMonthHeading', { year: item.year })}
      </h3>
      <ol className="sr-only" aria-label={t('performance.annualBuyMonthChart')}>
        {months.map((month) => (
          <li key={month.month}>
            {formatBuyMonth(month.month, locale)}
            {': '}
            {formatExactDecimalAmount(month.buyAmount, locale, currency)}
          </li>
        ))}
      </ol>
      {months.length === 0 ? null : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.gridStrokeAlt} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => formatCompactCurrencyAxis(value, locale)}
              />
              <Tooltip />
              <Legend formatter={(value) => t(typeLabelKey(value as PortfolioAnnualBuyAssetType))} />
              {types.map((type) => (
                <Bar key={type} dataKey={type} stackId="month" fill={TYPE_COLORS[type]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
