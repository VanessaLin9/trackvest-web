import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthenticatedUser } from '../../app/use-auth'
import { useI18n } from '../../i18n'
import type { AssetPerformanceStatusFilter } from '../../lib/asset-performance'
import { formatSnapshotDate } from '../../lib/formatters'
import { portfolioService } from '../../lib/portfolio.service'
import { queryKeys, resolveAccountScopeKey } from '../../lib/query-keys'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { AssetHistoryTable } from './AssetHistoryTable'

type AssetHistoryCardProps = {
  variant: 'dashboard' | 'page'
  accountId?: string
}

export function AssetHistoryCard({
  variant,
  accountId,
}: AssetHistoryCardProps) {
  const currentUserId = useAuthenticatedUser().id
  const { t, locale } = useI18n()
  const [statusFilter, setStatusFilter] =
    useState<AssetPerformanceStatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const accountScope = resolveAccountScopeKey(accountId)

  // 這張卡獨立取數：失敗時只影響自己，不擋住 KPI／holdings（PR #27）。
  const query = useQuery({
    queryKey: queryKeys.portfolio.assetPerformance(currentUserId, accountScope),
    queryFn: () =>
      portfolioService.getAssetPerformance(
        accountId ? { accountId } : undefined,
      ),
    enabled: Boolean(currentUserId),
  })

  useEffect(() => {
    setPage(1)
  }, [statusFilter, searchQuery, accountScope])

  if (!currentUserId) {
    return null
  }

  const isDashboard = variant === 'dashboard'
  const generatedAt = query.data
    ? formatSnapshotDate(query.data.generatedAt, locale)
    : null

  return (
    <Card as="section" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {t(isDashboard ? 'performance.dashboardTitle' : 'performance.title')}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            {t(
              isDashboard
                ? 'performance.dashboardDescription'
                : 'performance.description',
            )}
          </p>
        </div>
        {isDashboard ? (
          <Link
            to="/performance"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {t('performance.viewAll')}
          </Link>
        ) : null}
      </div>

      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        {t('performance.mockNotice')}
      </p>

      {generatedAt ? (
        <p className="text-xs text-gray-500" title={t('performance.generatedAtHint')}>
          {t('performance.generatedAt', { date: generatedAt })}
        </p>
      ) : null}

      {query.isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : null}

      {query.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{t('performance.loadError')}</p>
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

      {!query.isLoading && !query.error && (query.data?.items.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
          <h3 className="text-base font-semibold text-slate-900">
            {t('performance.emptyTitle')}
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600">
            {t('performance.emptyDescription')}
          </p>
          <Link
            to="/investments"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {t('performance.recordTrade')}
          </Link>
        </div>
      ) : null}

      {!query.isLoading && !query.error && (query.data?.items.length ?? 0) > 0 ? (
        <AssetHistoryTable
          items={query.data?.items ?? []}
          showFilters={!isDashboard}
          showPagination={!isDashboard}
          statusFilter={isDashboard ? 'all' : statusFilter}
          searchQuery={isDashboard ? '' : searchQuery}
          page={isDashboard ? 1 : page}
          onStatusFilterChange={setStatusFilter}
          onSearchQueryChange={setSearchQuery}
          onPageChange={setPage}
        />
      ) : null}
    </Card>
  )
}
