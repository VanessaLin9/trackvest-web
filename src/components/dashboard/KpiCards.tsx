import { useI18n } from '../../i18n'
import {
  formatCurrencyWithCode,
  formatPercent,
  formatSignedCurrency,
} from '../../lib/formatters'
import type { PortfolioSummary } from '../../lib/portfolio.service'
import { Card } from '../ui/Card'

interface KpiCardsProps {
  summary: PortfolioSummary | undefined
  displayCurrency: string | null
}

/**
 * Four top-level KPI tiles: invested capital, market value, total PnL,
 * total return rate. Values fall back to `0` while the initial summary
 * request is in flight so the layout doesn't collapse.
 */
export function KpiCards({ summary, displayCurrency }: KpiCardsProps) {
  const { t, locale } = useI18n()

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <p className="text-sm text-gray-500">{t('dashboard.investedCapital')}</p>
        <p className="mt-3 text-3xl font-semibold text-slate-900">
          {formatCurrencyWithCode(summary?.investedCapital ?? 0, locale, displayCurrency)}
        </p>
        <p className="mt-2 text-xs text-gray-500">
          {t('dashboard.investedCapitalHint')}
        </p>
      </Card>

      <Card>
        <p className="text-sm text-gray-500">{t('dashboard.marketValue')}</p>
        <p className="mt-3 text-3xl font-semibold text-blue-700">
          {formatCurrencyWithCode(summary?.marketValue ?? 0, locale, displayCurrency)}
        </p>
        <p className="mt-2 text-xs text-gray-500">{t('dashboard.marketValueHint')}</p>
      </Card>

      <Card>
        <p className="text-sm text-gray-500">{t('dashboard.totalPnl')}</p>
        <p className="mt-3 text-3xl font-semibold text-emerald-700">
          {formatSignedCurrency(summary?.totalPnl ?? 0, locale, displayCurrency)}
        </p>
        <p className="mt-2 text-xs text-gray-500">{t('dashboard.pnlDescription')}</p>
      </Card>

      <Card>
        <p className="text-sm text-gray-500">{t('dashboard.totalReturn')}</p>
        <p className="mt-3 text-3xl font-semibold text-emerald-700">
          {formatPercent(summary?.totalReturnRate ?? 0)}
        </p>
        <p className="mt-2 text-xs text-gray-500">{t('dashboard.returnDescription')}</p>
      </Card>
    </section>
  )
}
