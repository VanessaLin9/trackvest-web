import type { ChartValue } from './PortfolioCharts'
import { formatCurrencyWithCode } from '../../lib/formatters'
import type { PortfolioHolding } from '../../lib/portfolio.service'

/**
 * Fall back to the asset's base currency when a holding has no explicit
 * latest-price currency. Isolated so the JSX stays readable.
 */
export function getHoldingLatestPriceCurrency(holding: PortfolioHolding): string {
  return holding.latestPriceCurrency ?? holding.assetBaseCurrency
}

/**
 * Render a single tooltip cell from a Recharts `ChartValue`. Array values
 * (ranges) are joined with a slash; numbers are formatted as currency; the
 * rest are coerced to string.
 */
export function renderTooltipValue(
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
