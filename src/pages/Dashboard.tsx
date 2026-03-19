import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useCurrentUserId } from '../app/current-user'

type HealthResponse = {
  status?: string
  [key: string]: unknown
}

type DashboardSummaryResponse = {
  todayExpense: {
    amount: number
    currency: string | null
  }
  monthExpense: {
    amount: number
    currency: string | null
  }
  investment: {
    totalAssets: {
      amount: number
      currency: string | null
    }
    totalReturn: {
      amount: number
      currency: string | null
      rate: number
    }
  }
}

type ActivityItem = {
  id: string
  kind: 'cashbook' | 'investment'
  date: string
  title: string
  subtitle: string
  amount: number | null
  currency: string | null
  direction: 'in' | 'out' | 'neutral'
}

type DashboardActivityResponse = {
  accountOverview: Array<{
    id: string
    name: string
    type: string
    currency: string | null
    balance: number
  }>
  recentActivity: ActivityItem[]
}

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function formatSignedCurrency(value: number) {
  const prefix = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${prefix}${formatCurrency(Math.abs(value))}`
}

function formatPercent(value: number) {
  const prefix = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${prefix}${Math.abs(value).toFixed(2)}%`
}

function formatCurrencyWithCode(value: number, currency: string | null) {
  const prefix = value < 0 ? '-' : ''
  const amount = `${prefix}${formatCurrency(Math.abs(value))}`
  return currency ? `${amount} ${currency}` : amount
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

function formatActivityAmount(item: ActivityItem) {
  if (item.amount === null) {
    return null
  }

  const prefix =
    item.direction === 'in' ? '+' : item.direction === 'out' ? '-' : ''
  const amount = `${prefix}${formatCurrency(item.amount)}`
  return item.currency ? `${amount} ${item.currency}` : amount
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === 'object' && 'response' in err) {
    return (
      (err.response as { data?: { message?: string } })?.data?.message ??
      fallback
    )
  }

  if (err instanceof Error) {
    return err.message
  }

  return fallback
}

export default function Dashboard() {
  const currentUserId = useCurrentUserId()
  const healthQuery = useQuery({
    queryKey: ['dashboard', 'health'],
    queryFn: async () => (await api.get<HealthResponse>('/health')).data,
    refetchInterval: 5000,
  })

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary', currentUserId],
    queryFn: async () => (await api.get<DashboardSummaryResponse>('/dashboard/summary')).data,
    enabled: Boolean(currentUserId),
  })

  const activityQuery = useQuery({
    queryKey: ['dashboard', 'activity', currentUserId],
    queryFn: () =>
      api
        .get<DashboardActivityResponse>('/dashboard/activity', {
          params: { take: 10 },
        })
        .then((response) => response.data),
    enabled: Boolean(currentUserId),
  })

  const dashboardMetrics = summaryQuery.data
    ? {
        todayExpense: summaryQuery.data.todayExpense.amount,
        todayExpenseCurrency: summaryQuery.data.todayExpense.currency,
        monthExpense: summaryQuery.data.monthExpense.amount,
        monthExpenseCurrency: summaryQuery.data.monthExpense.currency,
        totalInvestmentAssets: summaryQuery.data.investment.totalAssets.amount,
        totalInvestmentAssetsCurrency:
          summaryQuery.data.investment.totalAssets.currency,
        totalReturnAmount: summaryQuery.data.investment.totalReturn.amount,
        totalReturnCurrency: summaryQuery.data.investment.totalReturn.currency,
        totalReturnRate: summaryQuery.data.investment.totalReturn.rate,
      }
    : {
        todayExpense: 0,
        todayExpenseCurrency: null,
        monthExpense: 0,
        monthExpenseCurrency: null,
        totalInvestmentAssets: 0,
        totalInvestmentAssetsCurrency: null,
        totalReturnAmount: 0,
        totalReturnCurrency: null,
        totalReturnRate: 0,
      }

  const accountOverview = activityQuery.data?.accountOverview ?? []
  const activityFeed = activityQuery.data?.recentActivity ?? []
  const dataLoading = activityQuery.isLoading
  const dataError = activityQuery.error

  if (!currentUserId) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-3xl font-semibold">Dashboard</h1>
        <p className="text-red-600">
          VITE_DEMO_USER_ID is not set. Please set it in your .env file.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_45%,#334155_100%)] p-6 text-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-300">
                Trackvest
              </p>
              <div>
                <h1 className="text-3xl font-semibold">Daily money cockpit</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                  This first version is meant to answer three questions fast:
                  did I record today&apos;s money movement, what changed this
                  month, and where should I drill in next?
                </p>
              </div>
            </div>

            <div className="min-w-[220px] rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-300">
                  Backend
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    healthQuery.error
                      ? 'bg-red-500/20 text-red-100'
                      : 'bg-emerald-500/20 text-emerald-100'
                  }`}
                >
                  {healthQuery.error ? 'Unavailable' : 'Healthy'}
                </span>
              </div>
              <div className="mt-3 text-sm text-slate-200">
                {healthQuery.isLoading
                  ? 'Checking connection...'
                  : healthQuery.error
                  ? getErrorMessage(healthQuery.error, 'Health check failed')
                  : JSON.stringify(healthQuery.data)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-700">
            MVP Scope
          </p>
          <h2 className="mt-2 text-xl font-semibold text-amber-950">
            Dashboard first, reporting later
          </h2>
          <p className="mt-3 text-sm text-amber-900/80">
            The dashboard now reads its top summary cards and lower activity
            section from dedicated APIs. The numbers are still MVP-scoped, but
            the page is no longer stitching raw cashbook and investment data in
            the browser.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Today&apos;s expense</p>
          <p className="mt-3 text-3xl font-semibold text-red-600">
            {formatCurrency(dashboardMetrics.todayExpense)}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {summaryQuery.data
              ? `Summary API · ${dashboardMetrics.todayExpenseCurrency ?? 'N/A'}`
              : 'Waiting for summary API.'}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Month expense</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatCurrency(dashboardMetrics.monthExpense)}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {summaryQuery.data
              ? `Summary API · ${dashboardMetrics.monthExpenseCurrency ?? 'N/A'}`
              : 'Waiting for summary API.'}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total investment assets</p>
          <p className="mt-3 text-3xl font-semibold text-blue-700">
            {formatCurrency(dashboardMetrics.totalInvestmentAssets)}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {summaryQuery.data
              ? `Summary API · ${dashboardMetrics.totalInvestmentAssetsCurrency ?? 'N/A'}`
              : 'Waiting for summary API.'}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total return</p>
          <p
            className={`mt-3 text-3xl font-semibold ${
              dashboardMetrics.totalReturnAmount > 0
                ? 'text-green-600'
                : dashboardMetrics.totalReturnAmount < 0
                ? 'text-red-600'
                : 'text-slate-900'
            }`}
          >
            {formatSignedCurrency(dashboardMetrics.totalReturnAmount)}
          </p>
          <p className="mt-2 text-sm font-medium text-gray-600">
            {formatPercent(dashboardMetrics.totalReturnRate)}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {summaryQuery.data
              ? `Summary API · ${dashboardMetrics.totalReturnCurrency ?? 'N/A'}`
              : 'Waiting for summary API.'}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Account overview</h2>
              <p className="text-sm text-gray-500">
                Asset-side balances returned by `GET /dashboard/activity`.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {accountOverview.length} accounts
            </span>
          </div>

          {activityQuery.isLoading ? (
            <p className="text-sm text-gray-500">Loading accounts...</p>
          ) : accountOverview.length === 0 ? (
            <p className="text-sm text-gray-500">No asset accounts yet.</p>
          ) : (
            <div className="space-y-3">
              {accountOverview.map((account) => (
                <div
                  key={account.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{account.name}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                        {account.currency ?? 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm text-gray-800">
                        {formatCurrencyWithCode(account.balance, account.currency)}
                      </p>
                      <span className="mt-1 inline-flex rounded-full bg-white px-3 py-1 text-xs text-gray-600">
                        {account.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Recent activity</h2>
            <p className="text-sm text-gray-500">
              Unified feed returned by `GET /dashboard/activity`.
            </p>
          </div>

          {dataLoading ? (
            <p className="text-sm text-gray-500">Loading activity...</p>
          ) : dataError ? (
            <p className="text-sm text-red-600">
              {getErrorMessage(dataError, 'Failed to load dashboard data')}
            </p>
          ) : activityFeed.length === 0 ? (
            <p className="text-sm text-gray-500">No recent activity yet.</p>
          ) : (
            <div className="space-y-3">
              {activityFeed.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-gray-200 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                            item.kind === 'cashbook'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {item.kind}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDateTime(item.date)}
                        </span>
                      </div>
                      <p className="mt-2 font-medium text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500">{item.subtitle}</p>
                    </div>
                    {item.amount !== null && (
                      <span
                        className={`whitespace-nowrap font-mono text-sm ${
                          item.direction === 'in'
                            ? 'text-green-700'
                            : item.direction === 'out'
                            ? 'text-red-600'
                            : 'text-gray-700'
                        }`}
                      >
                        {formatActivityAmount(item)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-5">
        <h2 className="text-lg font-semibold">Current API boundaries</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-medium">`GET /dashboard/summary`</p>
            <p className="mt-2 text-sm text-gray-600">
              The four KPI cards at the top already read from this endpoint.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-medium">`GET /dashboard/activity`</p>
            <p className="mt-2 text-sm text-gray-600">
              Account overview and recent activity now share one
              dashboard-specific response.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-medium">`GET /accounts/balances`</p>
            <p className="mt-2 text-sm text-gray-600">
              Still worth splitting later if balances need to be reused outside
              the dashboard page.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
