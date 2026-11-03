import { useI18n } from '../../i18n'
import {
  formatBuyMonth,
  formatSharePercent,
  monthsAsReturned,
  type PortfolioAnnualBuyItem,
} from '../../lib/annual-buys'
import {
  formatExactDecimalAmount,
  formatSignedExactDecimalAmount,
  signedAmountClassName,
} from '../../lib/formatters'

type AnnualBuyTablesProps = {
  rows: PortfolioAnnualBuyItem[]
  selected: PortfolioAnnualBuyItem
  currentYear: number | null
}

function typeLabelKey(type: string) {
  if (type === 'equity') return 'performance.annualBuyTypeEquity'
  if (type === 'etf') return 'performance.annualBuyTypeEtf'
  if (type === 'crypto') return 'performance.annualBuyTypeCrypto'
  if (type === 'cash') return 'performance.annualBuyTypeCash'
  return 'performance.annualBuyTypeOther'
}

function Amount({
  value,
  currency,
  signed = false,
}: {
  value: string
  currency: string
  signed?: boolean
}) {
  const { locale } = useI18n()
  const formatted = signed
    ? formatSignedExactDecimalAmount(value, locale, currency)
    : formatExactDecimalAmount(value, locale, currency)

  return (
    <span className={`font-mono ${signed ? signedAmountClassName(value) : 'text-gray-700'}`}>
      {formatted}
    </span>
  )
}

export function AnnualBuyTables({
  rows,
  selected,
  currentYear,
}: AnnualBuyTablesProps) {
  const { t, locale } = useI18n()
  const months = monthsAsReturned(selected)

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table
          className="w-full min-w-[760px] border-collapse text-sm"
          aria-label={t('performance.annualBuyYearTable')}
        >
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-600">
              <th className="px-3 py-3 font-medium">{t('performance.annualBuyYearLabel')}</th>
              <th className="px-3 py-3 font-medium">{t('performance.annualBuyCount')}</th>
              <th className="px-3 py-3 font-medium">{t('performance.annualBuyAmount')}</th>
              <th className="px-3 py-3 font-medium">{t('performance.annualBuySellCount')}</th>
              <th className="px-3 py-3 font-medium">{t('performance.annualBuySellProceeds')}</th>
              <th className="px-3 py-3 font-medium">{t('performance.annualBuyMinusSell')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.year}:${row.currency}`} className="border-b border-gray-100">
                <td className="px-3 py-3">
                  <span className="font-medium text-gray-900">{row.year}</span>
                  {currentYear === row.year ? (
                    <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {t('performance.annualYearToDate')}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3 font-mono text-gray-700">
                  {row.buyCount.toLocaleString(locale)}
                </td>
                <td className="px-3 py-3">
                  <Amount value={row.buyAmount} currency={row.currency} />
                </td>
                <td className="px-3 py-3 font-mono text-gray-700">
                  {row.sellCount.toLocaleString(locale)}
                </td>
                <td className="px-3 py-3">
                  <Amount value={row.sellNetProceeds} currency={row.currency} />
                </td>
                <td className="px-3 py-3">
                  <Amount value={row.buyMinusSellProceeds} currency={row.currency} signed />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        {selected.types.length === 0 ? (
          <p className="text-sm text-gray-600">{t('performance.annualBuyNoBuys')}</p>
        ) : (
          <table
            className="w-full min-w-[480px] border-collapse text-sm"
            aria-label={t('performance.annualBuyTypeTable')}
          >
            <caption className="mb-2 text-left text-sm font-semibold text-slate-800">
              {t('performance.annualBuyTypeCaption', { year: selected.year })}
            </caption>
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="px-3 py-3 font-medium">{t('performance.annualBuyType')}</th>
                <th className="px-3 py-3 font-medium">{t('performance.annualBuyAmount')}</th>
                <th className="px-3 py-3 font-medium">{t('performance.annualBuyShare')}</th>
              </tr>
            </thead>
            <tbody>
              {selected.types.map((type) => {
                const share = formatSharePercent(type.share)
                return (
                  <tr key={type.type} className="border-b border-gray-100">
                    <td className="px-3 py-3 text-gray-900">{t(typeLabelKey(type.type))}</td>
                    <td className="px-3 py-3">
                      <Amount value={type.buyAmount} currency={selected.currency} />
                    </td>
                    <td className="px-3 py-3 font-mono text-gray-700">
                      {share ?? t('performance.annualBuyNoType')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="overflow-x-auto">
        <table
          className="w-full min-w-[420px] border-collapse text-sm"
          aria-label={t('performance.annualBuyMonthTable')}
        >
          <caption className="mb-2 text-left text-sm font-semibold text-slate-800">
            {t('performance.annualBuyMonthHeading', { year: selected.year })}
          </caption>
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-600">
              <th className="px-3 py-3 font-medium">{t('performance.annualBuyMonth')}</th>
              <th className="px-3 py-3 font-medium">{t('performance.annualBuyAmount')}</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month) => (
              <tr key={month.month} className="border-b border-gray-100">
                <td className="px-3 py-3 text-gray-900">
                  {formatBuyMonth(month.month, locale)}
                </td>
                <td className="px-3 py-3">
                  <Amount value={month.buyAmount} currency={selected.currency} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
