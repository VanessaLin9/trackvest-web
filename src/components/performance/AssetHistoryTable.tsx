import { useI18n } from '../../i18n'
import {
  ASSET_PERFORMANCE_PAGE_SIZE,
  filterAssetPerformanceItems,
  groupAssetPerformanceByCurrency,
  isDividendUnrecorded,
  paginateItems,
  type AssetPerformanceStatusFilter,
  type PortfolioAssetPerformanceItem,
} from '../../lib/asset-performance'
import {
  formatDecimalAmount,
  formatShareQuantityFromString,
  formatSignedDecimalAmount,
  formatSnapshotDate,
  signedAmountClassName,
} from '../../lib/formatters'
import { Button } from '../ui/Button'
import { SegmentedControl } from '../ui/SegmentedControl'

type AssetHistoryTableProps = {
  items: PortfolioAssetPerformanceItem[]
  showFilters?: boolean
  showPagination?: boolean
  statusFilter: AssetPerformanceStatusFilter
  searchQuery: string
  page: number
  onStatusFilterChange: (status: AssetPerformanceStatusFilter) => void
  onSearchQueryChange: (query: string) => void
  onPageChange: (page: number) => void
}

function UnavailableValue() {
  const { t } = useI18n()
  return <span className="text-gray-500">{t('performance.dataUnavailable')}</span>
}

function AmountCell({
  value,
  locale,
  currency,
  signed = false,
}: {
  value: string | null
  locale: string
  currency: string
  signed?: boolean
}) {
  const formatted = signed
    ? formatSignedDecimalAmount(value, locale, currency)
    : formatDecimalAmount(value, locale, currency)

  if (formatted === null) {
    return <UnavailableValue />
  }

  return (
    <span className={`font-mono ${signed ? signedAmountClassName(value) : 'text-gray-700'}`}>
      {formatted}
    </span>
  )
}

function DateCell({ value, locale }: { value: string | null; locale: string }) {
  if (!value) {
    return <UnavailableValue />
  }

  return <span className="text-gray-700">{formatSnapshotDate(value, locale)}</span>
}

export function AssetHistoryTable({
  items,
  showFilters = false,
  showPagination = false,
  statusFilter,
  searchQuery,
  page,
  onStatusFilterChange,
  onSearchQueryChange,
  onPageChange,
}: AssetHistoryTableProps) {
  const { t, locale } = useI18n()
  const filteredItems = filterAssetPerformanceItems(items, {
    status: statusFilter,
    query: searchQuery,
  })
  const paged = paginateItems(filteredItems, page)
  const groups = groupAssetPerformanceByCurrency(paged.items)
  const from =
    paged.total === 0 ? 0 : (paged.page - 1) * ASSET_PERFORMANCE_PAGE_SIZE + 1
  const to = Math.min(paged.page * ASSET_PERFORMANCE_PAGE_SIZE, paged.total)

  return (
    <div className="space-y-4">
      {showFilters ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500">
              {t('performance.filterLabel')}
            </p>
            <SegmentedControl
              value={statusFilter}
              onChange={onStatusFilterChange}
              options={[
                { value: 'all', label: t('performance.filterAll') },
                { value: 'holding', label: t('performance.filterHolding') },
                { value: 'closed', label: t('performance.filterClosed') },
              ]}
            />
          </div>
          <label className="block text-sm text-gray-600">
            <span className="mb-1 block">{t('performance.searchLabel')}</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder={t('performance.searchPlaceholder')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 sm:w-64"
            />
          </label>
        </div>
      ) : null}

      <p className="text-xs text-gray-500">{t('performance.nativeCurrencyNote')}</p>
      <p className="text-xs text-gray-500">{t('performance.tradeNetPnlHint')}</p>

      {paged.total === 0 ? (
        <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
          {t('common.noDataAvailable')}
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.currency} className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">
              {t('performance.currencyGroup', { currency: group.currency })}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="sticky left-0 z-10 bg-white px-3 py-3 font-medium">
                      {t('performance.asset')}
                    </th>
                    <th className="px-3 py-3 font-medium">{t('performance.status')}</th>
                    <th className="px-3 py-3 font-medium">{t('performance.quantity')}</th>
                    <th className="px-3 py-3 font-medium">
                      {t('performance.realizedNetPnl')}
                    </th>
                    <th className="px-3 py-3 font-medium">
                      {t('performance.unrealizedPnl')}
                    </th>
                    <th className="px-3 py-3 font-medium">
                      {t('performance.tradeNetPnl')}
                    </th>
                    <th className="px-3 py-3 font-medium">
                      {t('performance.recordedDividend')}
                    </th>
                    <th className="px-3 py-3 font-medium">{t('performance.firstBuyAt')}</th>
                    <th className="px-3 py-3 font-medium">{t('performance.lastTradeAt')}</th>
                    <th className="px-3 py-3 font-medium">{t('performance.priceAsOf')}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => (
                    <tr
                      key={`${item.assetId}:${item.currency}`}
                      className="border-b border-gray-100 align-top"
                    >
                      <td className="sticky left-0 z-10 bg-white px-3 py-3">
                        <div className="font-medium text-gray-900">{item.symbol}</div>
                        <div className="text-xs text-gray-500">{item.name}</div>
                        {item.issues.length > 0 ? (
                          <ul className="mt-1 space-y-0.5 text-xs text-amber-800">
                            {item.issues.map((issue) => (
                              <li key={issue}>{t(`performance.issue${issue}`)}</li>
                            ))}
                          </ul>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-gray-700">
                        {item.status === 'holding'
                          ? t('performance.statusHolding')
                          : t('performance.statusClosed')}
                      </td>
                      <td className="px-3 py-3 font-mono text-gray-700">
                        {formatShareQuantityFromString(
                          item.quantity,
                          locale,
                          t('performance.quantityUnitShares'),
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <AmountCell
                          value={item.realizedNetPnl}
                          locale={locale}
                          currency={item.currency}
                          signed
                        />
                      </td>
                      <td className="px-3 py-3">
                        <AmountCell
                          value={item.unrealizedPnl}
                          locale={locale}
                          currency={item.currency}
                          signed
                        />
                      </td>
                      <td className="px-3 py-3">
                        <AmountCell
                          value={item.tradeNetPnl}
                          locale={locale}
                          currency={item.currency}
                          signed
                        />
                      </td>
                      <td className="px-3 py-3">
                        {isDividendUnrecorded(item) ? (
                          <span className="text-gray-500">
                            {t('performance.dividendNotRecorded')}
                          </span>
                        ) : (
                          <AmountCell
                            value={item.recordedDividendAmount}
                            locale={locale}
                            currency={item.currency}
                          />
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <DateCell value={item.firstBuyAt} locale={locale} />
                      </td>
                      <td className="px-3 py-3">
                        <DateCell value={item.lastTradeAt} locale={locale} />
                      </td>
                      <td className="px-3 py-3">
                        <DateCell value={item.priceAsOf} locale={locale} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {showPagination && paged.total > ASSET_PERFORMANCE_PAGE_SIZE ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
          <p>
            {t('performance.pageStatus', {
              from,
              to,
              total: paged.total,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={paged.page <= 1}
              onClick={() => onPageChange(paged.page - 1)}
            >
              {t('performance.previousPage')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={paged.page >= paged.totalPages}
              onClick={() => onPageChange(paged.page + 1)}
            >
              {t('performance.nextPage')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
