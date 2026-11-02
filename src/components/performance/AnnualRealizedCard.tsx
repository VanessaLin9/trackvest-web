import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthenticatedUser } from '../../app/use-auth'
import { useI18n } from '../../i18n'
import {
  annualChartPoints,
  annualCurrencies,
  annualRowsForCurrency,
  yearInTimeZone,
} from '../../lib/annual-realized'
import { formatSnapshotDate } from '../../lib/formatters'
import { portfolioService } from '../../lib/portfolio.service'
import { queryKeys, resolveAccountScopeKey } from '../../lib/query-keys'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { SegmentedControl } from '../ui/SegmentedControl'
import { AnnualRealizedChart } from './AnnualRealizedChart'
import { AnnualRealizedTable } from './AnnualRealizedTable'

type AnnualRealizedCardProps = {
  accountId?: string
}

export function AnnualRealizedCard({
  accountId,
}: AnnualRealizedCardProps) {
  const currentUserId = useAuthenticatedUser().id
  const { t, locale } = useI18n()
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null)
  const accountScope = resolveAccountScopeKey(accountId)

  // 這張卡獨立取數：失敗時只影響自己，不擋住 KPI、holdings 或歷史成果。
  const query = useQuery({
    queryKey: queryKeys.portfolio.annualRealized(currentUserId, accountScope),
    queryFn: () =>
      portfolioService.getAnnualRealized(accountId ? { accountId } : undefined),
    enabled: Boolean(currentUserId),
  })

  if (!currentUserId) {
    return null
  }

  const response = query.data
  const items = response?.items ?? []
  const currencies = annualCurrencies(items)
  const currency = currencies.includes(selectedCurrency ?? '')
    ? selectedCurrency
    : (currencies[0] ?? null)
  const currentYear = response
    ? yearInTimeZone(response.generatedAt, response.timeZone)
    : null
  const rows = currency ? annualRowsForCurrency(items, currency) : []
  const points = currency ? annualChartPoints(items, currency, currentYear) : []
  const omitsMissing = points.some((point) => point.chartValue === null)
  const generatedAt = response
    ? formatSnapshotDate(response.generatedAt, locale)
    : null
  const historyHref = '/performance#asset-history'

  return (
    <Card as="section" className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          {t('performance.annualTitle')}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          {t('performance.annualDescription')}
        </p>
      </div>

      {response ? (
        <p className="text-xs text-gray-500">
          {t('performance.annualTimeZoneNote', { timeZone: response.timeZone })}
        </p>
      ) : null}

      {generatedAt ? (
        <p className="text-xs text-gray-500" title={t('performance.generatedAtHint')}>
          {t('performance.generatedAt', { date: generatedAt })}
        </p>
      ) : null}

      <Link
        to={historyHref}
        className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        {t('performance.annualHistoryLink')}
      </Link>

      {query.isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : null}

      {query.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{t('performance.annualLoadError')}</p>
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
            {t('performance.annualEmptyTitle')}
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600">
            {t('performance.annualEmptyDescription')}
          </p>
        </div>
      ) : null}

      {!query.isLoading && !query.error && currency ? (
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
          <AnnualRealizedChart points={points} currency={currency} />
          {omitsMissing ? (
            <p className="text-xs text-gray-500">
              {t('performance.annualChartOmitsMissing')}
            </p>
          ) : null}
          <h3 className="text-sm font-semibold text-slate-800">
            {t('performance.currencyGroup', { currency })}
          </h3>
          <AnnualRealizedTable rows={rows} currentYear={currentYear} />
        </>
      ) : null}
    </Card>
  )
}
