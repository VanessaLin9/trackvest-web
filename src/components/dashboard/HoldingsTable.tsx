import { useI18n } from '../../i18n'
import {
  formatCurrencyWithCode,
  formatPercent,
  formatSignedCurrency,
} from '../../lib/formatters'
import type { PortfolioHolding } from '../../lib/portfolio.service'
import { Card } from '../ui/Card'

interface HoldingsTableProps {
  holdings: PortfolioHolding[]
  selectedHoldingId: string | null
  onSelectHolding: (assetId: string) => void
  displayCurrency: string | null
}

/**
 * Portfolio holdings listing. Clicking a row selects it and drives the
 * detail aside to the right. Styling is a plain HTML table rather than
 * `DataTable` because the dashboard wants per-row selection highlighting
 * and sign-aware coloring that isn't worth generalizing for one caller.
 */
export function HoldingsTable({
  holdings,
  selectedHoldingId,
  onSelectHolding,
  displayCurrency,
}: HoldingsTableProps) {
  const { t, locale } = useI18n()

  return (
    <Card>
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
              const isSelected = holding.assetId === selectedHoldingId

              return (
                <tr
                  key={holding.assetId}
                  onClick={() => onSelectHolding(holding.assetId)}
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
    </Card>
  )
}
