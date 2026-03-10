import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import {
  cashbookService,
  type GlAccount,
  type GlEntry,
} from '../lib/cashbook.service'
import {
  investmentsService,
  type TransactionListItem,
} from '../lib/investments.service'

const DEMO_USER_ID = import.meta.env.VITE_DEMO_USER_ID

type HealthResponse = {
  status?: string
  [key: string]: unknown
}

type ActivityItem = {
  id: string
  kind: 'cashbook' | 'investment'
  date: string
  title: string
  subtitle: string
  amount?: string
}

function getMonthStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function getTodayStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
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

function sumCashLineAmounts(
  entries: GlEntry[],
  assetAccountIds: Set<string>,
  source: 'manual:expense' | 'manual:income',
  periodStart: Date,
) {
  return entries.reduce((total, entry) => {
    if (!entry.source?.startsWith(source) || new Date(entry.date) < periodStart) {
      return total
    }

    const line = entry.lines?.find((item) => assetAccountIds.has(item.glAccountId))
    if (!line) {
      return total
    }

    return total + Number(line.amount)
  }, 0)
}

function buildCashbookActivities(entries: GlEntry[], accountNameMap: Record<string, string>) {
  return entries
    .filter((entry) =>
      entry.source === 'manual:expense' ||
      entry.source === 'manual:income' ||
      entry.source === 'manual:transfer',
    )
    .map<ActivityItem>((entry) => {
      const cashLine = entry.lines?.find((line) => accountNameMap[line.glAccountId])
      const action =
        entry.source === 'manual:expense'
          ? 'Expense'
          : entry.source === 'manual:income'
          ? 'Income'
          : 'Transfer'

      return {
        id: `cashbook-${entry.id}`,
        kind: 'cashbook',
        date: entry.date,
        title: entry.memo || action,
        subtitle: cashLine
          ? `${action} · ${accountNameMap[cashLine.glAccountId]}`
          : action,
        amount: cashLine
          ? `${cashLine.side === 'credit' ? '-' : '+'}${formatCurrency(
              Number(cashLine.amount),
            )} ${cashLine.currency}`
          : undefined,
      }
    })
}

function buildInvestmentActivities(transactions: TransactionListItem[]) {
  return transactions.map<ActivityItem>((transaction) => ({
    id: `investment-${transaction.id}`,
    kind: 'investment',
    date: transaction.tradeTime,
    title:
      transaction.asset?.symbol ||
      transaction.note ||
      transaction.type,
    subtitle: `${transaction.type} · ${transaction.account?.name || transaction.accountId}`,
    amount: formatCurrency(Number(transaction.amount)),
  }))
}

export default function Dashboard() {
  const healthQuery = useQuery({
    queryKey: ['dashboard', 'health'],
    queryFn: async () => (await api.get<HealthResponse>('/health')).data,
    refetchInterval: 5000,
  })

  const accountsQuery = useQuery({
    queryKey: ['dashboard', 'asset-accounts', DEMO_USER_ID],
    queryFn: () => cashbookService.getGlAccounts(DEMO_USER_ID, 'asset'),
    enabled: Boolean(DEMO_USER_ID),
  })

  const entriesQuery = useQuery({
    queryKey: ['dashboard', 'gl-entries', DEMO_USER_ID],
    queryFn: () => cashbookService.getGlEntries(DEMO_USER_ID, 'All'),
    enabled: Boolean(DEMO_USER_ID),
  })

  const transactionsQuery = useQuery({
    queryKey: ['dashboard', 'transactions', DEMO_USER_ID],
    queryFn: () =>
      investmentsService.getTransactions(DEMO_USER_ID, { take: 10 }),
    enabled: Boolean(DEMO_USER_ID),
  })

  const accounts = (accountsQuery.data ?? []) as GlAccount[]
  const entries = (entriesQuery.data ?? []) as GlEntry[]
  const transactions = (transactionsQuery.data?.items ?? []) as TransactionListItem[]

  const assetAccountIds = useMemo(
    () => new Set(accounts.map((account) => account.id)),
    [accounts],
  )

  const accountNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const account of accounts) {
      map[account.id] = account.name
    }
    return map
  }, [accounts])

  const monthStart = getMonthStart()
  const todayStart = getTodayStart()

  const dashboardMetrics = useMemo(() => {
    const todayExpense = sumCashLineAmounts(
      entries,
      assetAccountIds,
      'manual:expense',
      todayStart,
    )
    const monthExpense = sumCashLineAmounts(
      entries,
      assetAccountIds,
      'manual:expense',
      monthStart,
    )
    const monthIncome = sumCashLineAmounts(
      entries,
      assetAccountIds,
      'manual:income',
      monthStart,
    )
    const monthInvestmentCount = transactions.filter(
      (transaction) => new Date(transaction.tradeTime) >= monthStart,
    ).length

    return {
      todayExpense,
      monthExpense,
      monthIncome,
      monthInvestmentCount,
    }
  }, [assetAccountIds, entries, monthStart, todayStart, transactions])

  const activityFeed = useMemo(() => {
    const cashbookActivities = buildCashbookActivities(entries, accountNameMap)
    const investmentActivities = buildInvestmentActivities(transactions)

    return [...cashbookActivities, ...investmentActivities]
      .sort(
        (left, right) =>
          new Date(right.date).getTime() - new Date(left.date).getTime(),
      )
      .slice(0, 10)
  }, [accountNameMap, entries, transactions])

  const dataLoading =
    accountsQuery.isLoading || entriesQuery.isLoading || transactionsQuery.isLoading

  const dataError =
    accountsQuery.error || entriesQuery.error || transactionsQuery.error

  if (!DEMO_USER_ID) {
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
            This page is intentionally a discussion surface. The layout is real,
            but some numbers are stitched together from existing APIs so we can
            decide which dedicated summary endpoints are actually worth building.
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
            From manual expense entries hitting cash accounts today.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Month income</p>
          <p className="mt-3 text-3xl font-semibold text-green-600">
            {formatCurrency(dashboardMetrics.monthIncome)}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Based on current `manual:income` cash-side entries.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Month expense</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatCurrency(dashboardMetrics.monthExpense)}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Good enough for shape review; likely wants a dedicated API later.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Investment actions</p>
          <p className="mt-3 text-3xl font-semibold text-blue-700">
            {dashboardMetrics.monthInvestmentCount}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Transactions recorded this month in the investment flow.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Account overview</h2>
              <p className="text-sm text-gray-500">
                Cash and bank accounts available to daily flows.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {accounts.length} accounts
            </span>
          </div>

          {accountsQuery.isLoading ? (
            <p className="text-sm text-gray-500">Loading accounts...</p>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-gray-500">No asset accounts yet.</p>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{account.name}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                        {account.currency}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-600">
                      {account.type}
                    </span>
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
              Mixed feed from cashbook postings and investment transactions.
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
                    {item.amount && (
                      <span className="whitespace-nowrap font-mono text-sm text-gray-700">
                        {item.amount}
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
        <h2 className="text-lg font-semibold">Likely next API candidates</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-medium">`GET /dashboard/summary`</p>
            <p className="mt-2 text-sm text-gray-600">
              Today, month-to-date, and account balance cards should probably
              come from one response instead of stitched client logic.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-medium">`GET /dashboard/activity`</p>
            <p className="mt-2 text-sm text-gray-600">
              A mixed feed would be easier to sort and filter if the backend
              intentionally shaped it.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-medium">`GET /accounts/balances`</p>
            <p className="mt-2 text-sm text-gray-600">
              The dashboard wants balances, not just account metadata. That is a
              clear API boundary if you like this overview section.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
