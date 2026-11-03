import { useI18n } from '../../i18n'
import type { PortfolioAnnualRealizedItem } from '../../lib/annual-realized'
import {
  formatExactDecimalAmount,
  formatSignedExactDecimalAmount,
  signedAmountClassName,
} from '../../lib/formatters'

type AnnualRealizedTableProps = {
  rows: PortfolioAnnualRealizedItem[]
  currentYear: number | null
}

function UnavailableValue() {
  const { t } = useI18n()
  return <span className="text-gray-500">{t('performance.dataUnavailable')}</span>
}

function AmountCell({
  value,
  currency,
  signed = false,
}: {
  value: string | null
  currency: string
  signed?: boolean
}) {
  const { locale } = useI18n()
  const formatted = signed
    ? formatSignedExactDecimalAmount(value, locale, currency)
    : formatExactDecimalAmount(value, locale, currency)

  if (formatted === null) {
    return <UnavailableValue />
  }

  return (
    <span className={`font-mono ${signed ? signedAmountClassName(value) : 'text-gray-700'}`}>
      {formatted}
    </span>
  )
}

export function AnnualRealizedTable({
  rows,
  currentYear,
}: AnnualRealizedTableProps) {
  const { t, locale } = useI18n()

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full min-w-[720px] border-collapse text-sm"
        aria-label={t('performance.annualTableLabel')}
      >
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-600">
            <th className="px-3 py-3 font-medium">{t('performance.annualYear')}</th>
            <th className="px-3 py-3 font-medium">{t('performance.annualSellCount')}</th>
            <th className="px-3 py-3 font-medium">{t('performance.annualNetProceeds')}</th>
            <th className="px-3 py-3 font-medium">{t('performance.annualDisposedCost')}</th>
            <th className="px-3 py-3 font-medium">{t('performance.realizedNetPnl')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isCurrentYear = currentYear !== null && row.year === currentYear
            return (
              <tr
                key={`${row.year}:${row.currency}`}
                className="border-b border-gray-100 align-top"
              >
                <td className="px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900">{row.year}</span>
                    {isCurrentYear ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                        {t('performance.annualYearToDate')}
                      </span>
                    ) : null}
                  </div>
                  {row.issues.length > 0 ? (
                    <ul className="mt-1 space-y-0.5 text-xs text-amber-800">
                      {row.issues.map((issue) => (
                        <li key={issue}>{t(`performance.issue${issue}`)}</li>
                      ))}
                    </ul>
                  ) : null}
                </td>
                <td className="px-3 py-3 font-mono text-gray-700">
                  {row.sellCount.toLocaleString(locale)}
                </td>
                <td className="px-3 py-3">
                  <AmountCell value={row.netProceeds} currency={row.currency} />
                </td>
                <td className="px-3 py-3">
                  <AmountCell value={row.disposedCost} currency={row.currency} />
                </td>
                <td className="px-3 py-3">
                  <AmountCell
                    value={row.realizedNetPnl}
                    currency={row.currency}
                    signed
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
