import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthenticatedUser } from '../../app/use-auth'
import { useI18n } from '../../i18n'
import {
  annualBuyCurrencies,
  annualBuyRows,
  annualBuyYearPoints,
  calendarParts,
  formatSharePercent,
  yearsWithBuyMix,
} from '../../lib/annual-buys'
import {
  formatExactDecimalAmount,
  formatSignedExactDecimalAmount,
  formatSnapshotDate,
  signedAmountClassName,
} from '../../lib/formatters'
import { portfolioService } from '../../lib/portfolio.service'
import { queryKeys, resolveAccountScopeKey } from '../../lib/query-keys'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { SegmentedControl } from '../ui/SegmentedControl'
import {
  AnnualBuyAmountChart,
  AnnualBuyMonthChart,
  AnnualBuyShareChart,
} from './AnnualBuyCharts'
import { AnnualBuyTables } from './AnnualBuyTables'

type AnnualBuyAllocationCardProps = {
  variant: 'dashboard' | 'page'
  accountId?: string
}

function typeLabelKey(type: string) {
  if (type === 'equity') return 'performance.annualBuyTypeEquity'
  if (type === 'etf') return 'performance.annualBuyTypeEtf'
  if (type === 'crypto') return 'performance.annualBuyTypeCrypto'
  if (type === 'cash') return 'performance.annualBuyTypeCash'
  return 'performance.annualBuyTypeOther'
}

export function AnnualBuyAllocationCard({
  variant,
  accountId,
}: AnnualBuyAllocationCardProps) {
  const currentUserId = useAuthenticatedUser().id
  const { t, locale } = useI18n()
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const accountScope = resolveAccountScopeKey(accountId)

  // 這張卡獨立取數：失敗時只影響自己，不擋住持倉、歷史成果或年度已實現（PR #29）。
  // 首頁只摘要當年；完整年度、占比與月份在成果頁，避免跟持倉配置圖混在一起。
  const query = useQuery({
    queryKey: queryKeys.portfolio.annualBuys(currentUserId, accountScope),
    queryFn: () =>
      portfolioService.getAnnualBuys(accountId ? { accountId } : undefined),
    enabled: Boolean(currentUserId),
  })

  if (!currentUserId) {
    return null
  }

  const response = query.data
  const items = response?.items ?? []
  const currencies = annualBuyCurrencies(items)
  const currency = currencies.includes(selectedCurrency ?? '')
    ? selectedCurrency
    : (currencies[0] ?? null)
  const calendar = response
    ? calendarParts(response.generatedAt, response.timeZone)
    : null
  const rows = currency ? annualBuyRows(items, currency) : []
  const points = currency
    ? annualBuyYearPoints(items, currency, calendar?.year ?? null)
    : []
  const sharePoints = yearsWithBuyMix(points)
  const year = rows.some((row) => row.year === selectedYear)
    ? selectedYear
    : (rows.find((row) => row.year === calendar?.year)?.year ?? rows[0]?.year ?? null)
  const selected = rows.find((row) => row.year === year) ?? null
  const generatedAt = response ? formatSnapshotDate(response.generatedAt, locale) : null
  const isPage = variant === 'page'

  return (
    <Card
      as="section"
      id={isPage ? 'annual-buys' : undefined}
      className="scroll-mt-6 space-y-4"
    >
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          {t('performance.annualBuyTitle')}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          {t('performance.annualBuyDescription')}
        </p>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          {t('performance.annualBuyNotHoldings')}
        </p>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          {t('performance.annualBuyMinusSellHint')}
        </p>
      </div>

      {response ? (
        <p className="text-xs text-gray-500">
          {t('performance.annualBuyTimeZoneNote', { timeZone: response.timeZone })}
        </p>
      ) : null}
      {generatedAt ? (
        <p className="text-xs text-gray-500">
          {t('performance.generatedAt', { date: generatedAt })}
        </p>
      ) : null}

      {query.isLoading ? <p className="text-sm text-gray-500">{t('common.loading')}</p> : null}

      {query.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{t('performance.annualBuyLoadError')}</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => {
              void query.refetch()
            }}
          >
            {t('performance.retry')}
          </Button>
        </div>
      ) : null}

      {!query.isLoading && !query.error && items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
          <h3 className="text-base font-semibold text-slate-900">
            {t('performance.annualBuyEmptyTitle')}
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600">
            {t('performance.annualBuyEmptyDescription')}
          </p>
        </div>
      ) : null}

      {!query.isLoading && !query.error && currency && selected ? (
        <>
          <div>
            <p className="mb-2 text-sm text-gray-600">
              {t('performance.annualCurrencyLabel')}
            </p>
            <SegmentedControl
              value={currency}
              onChange={setSelectedCurrency}
              options={currencies.map((code) => ({ value: code, label: code }))}
            />
          </div>
          <p className="text-xs text-gray-500">{t('performance.nativeCurrencyNote')}</p>

          {isPage ? (
            <>
              <AnnualBuyAmountChart points={points} currency={currency} />
              {sharePoints.length > 0 ? (
                <>
                  <AnnualBuyShareChart points={sharePoints} />
                  <p className="text-xs text-gray-500">
                    {t('performance.annualBuyShareOmitted')}
                  </p>
                </>
              ) : null}
              <label className="block text-sm text-gray-600">
                {t('performance.annualBuyYearLabel')}
                <select
                  className="mt-1 block rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  value={selected.year}
                  onChange={(event) => setSelectedYear(Number(event.target.value))}
                >
                  {rows.map((row) => (
                    <option key={row.year} value={row.year}>
                      {row.year}
                      {calendar?.year === row.year
                        ? ` (${t('performance.annualYearToDate')})`
                        : ''}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-gray-500">{t('performance.annualBuyFutureMonths')}</p>
              <AnnualBuyMonthChart item={selected} currency={currency} />
              <AnnualBuyTables
                rows={rows}
                selected={selected}
                currentYear={calendar?.year ?? null}
              />
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                <span className="font-medium text-slate-900">{selected.year}</span>
                {calendar?.year === selected.year ? (
                  <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                    {t('performance.annualYearToDate')}
                  </span>
                ) : null}
              </p>
              <p className="font-mono text-lg text-slate-900">
                {formatExactDecimalAmount(selected.buyAmount, locale, currency)}
              </p>
              <p className="text-sm text-gray-600">
                {t('performance.annualBuyMinusSell')}:{' '}
                <span className={signedAmountClassName(selected.buyMinusSellProceeds)}>
                  {formatSignedExactDecimalAmount(
                    selected.buyMinusSellProceeds,
                    locale,
                    currency,
                  )}
                </span>
              </p>
              {selected.types.length === 0 ? (
                <p className="text-sm text-gray-600">{t('performance.annualBuyNoBuys')}</p>
              ) : (
                <ul className="space-y-1 text-sm text-gray-700">
                  {selected.types.map((type) => (
                    <li key={type.type}>
                      {t(typeLabelKey(type.type))}{' '}
                      {formatExactDecimalAmount(type.buyAmount, locale, currency)}
                      {formatSharePercent(type.share)
                        ? ` (${formatSharePercent(type.share)})`
                        : ''}
                    </li>
                  ))}
                </ul>
              )}
              <Link
                to="/performance#annual-buys"
                className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {t('performance.annualBuyViewDetails')}
              </Link>
            </div>
          )}
        </>
      ) : null}
    </Card>
  )
}
