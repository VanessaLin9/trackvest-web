import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useI18n } from '../../i18n'
import {
  plottedAnnualChartPoints,
  type AnnualChartPoint,
} from '../../lib/annual-realized'
import {
  formatCompactCurrencyAxis,
  formatSignedExactDecimalAmount,
} from '../../lib/formatters'
import { chartColors, getPnlColor } from '../../theme/chart-tokens'

type AnnualRealizedChartProps = {
  points: AnnualChartPoint[]
  currency: string
}

export function AnnualRealizedChart({
  points,
  currency,
}: AnnualRealizedChartProps) {
  const { t, locale } = useI18n()
  const plotted = plottedAnnualChartPoints(points)
  const data = plotted.map((point) => ({
    year: point.year,
    pnl: point.chartValue,
    color: getPnlColor(point.chartValue ?? 0),
  }))

  return (
    <div className="space-y-2">
      <ol className="sr-only" aria-label={t('performance.annualChartSequence')}>
        {points.map((point) => (
          <li key={point.year}>
            {point.isCurrentYear
              ? `${point.year} ${t('performance.annualYearToDate')}`
              : point.year}
            {': '}
            {point.chartValue === null
              ? t('performance.dataUnavailable')
              : formatSignedExactDecimalAmount(point.realizedNetPnl, locale, currency)}
          </li>
        ))}
      </ol>
      {data.length === 0 ? null : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={chartColors.gridStrokeAlt}
              />
              <XAxis dataKey="year" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => formatCompactCurrencyAxis(value, locale)}
              />
              <Tooltip
                formatter={(_value, _name, item) => {
                  const year = Number(
                    (item as { payload?: { year?: number } }).payload?.year,
                  )
                  const point = points.find((entry) => entry.year === year)
                  const label =
                    point && point.chartValue !== null
                      ? formatSignedExactDecimalAmount(
                          point.realizedNetPnl,
                          locale,
                          currency,
                        )
                      : t('performance.dataUnavailable')
                  return [label ?? t('performance.dataUnavailable'), t('performance.realizedNetPnl')]
                }}
              />
              <Bar dataKey="pnl" radius={[10, 10, 0, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.year} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
