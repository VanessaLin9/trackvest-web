import { useEffect, useMemo, useState } from 'react'
import {
  investmentsService,
  type Account,
  type Asset,
  type TransactionListItem,
} from '../lib/investments.service'

type InvestmentMode = 'deposit' | 'buy' | 'sell' | 'dividend'

const DEMO_USER_ID = import.meta.env.VITE_DEMO_USER_ID

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

function formatMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function Transactions() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [transactions, setTransactions] = useState<TransactionListItem[]>([])
  const [mode, setMode] = useState<InvestmentMode>('deposit')
  const [accountId, setAccountId] = useState('')
  const [assetId, setAssetId] = useState('')
  const [listAccountId, setListAccountId] = useState('All')
  const [amount, setAmount] = useState('')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [fee, setFee] = useState('')
  const [tradeTime, setTradeTime] = useState(() =>
    new Date().toISOString().slice(0, 16),
  )
  const [note, setNote] = useState('')
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const availableAccounts = useMemo(
    () => accounts.filter((account) => account.type !== 'cash' || mode === 'deposit'),
    [accounts, mode],
  )

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId),
    [accountId, accounts],
  )

  const availableAssets = useMemo(
    () => assets.filter((asset) => asset.type !== 'cash'),
    [assets],
  )

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === assetId),
    [assetId, assets],
  )

  const requiresAsset = mode === 'buy' || mode === 'sell' || mode === 'dividend'
  const requiresTradeFields = mode === 'buy' || mode === 'sell'

  const computedAmount = useMemo(() => {
    const numericQuantity = Number(quantity)
    const numericPrice = Number(price)
    const numericFee = Number(fee || '0')

    if (!requiresTradeFields) {
      return Number(amount || '0')
    }

    if (!Number.isFinite(numericQuantity) || !Number.isFinite(numericPrice)) {
      return 0
    }

    const gross = numericQuantity * numericPrice
    return mode === 'buy' ? gross + numericFee : gross - numericFee
  }, [amount, fee, mode, price, quantity, requiresTradeFields])

  async function loadTransactions(filterAccountId: string) {
    if (!DEMO_USER_ID) {
      return
    }

    setLoadingTransactions(true)
    try {
      const response = await investmentsService.getTransactions(DEMO_USER_ID, {
        accountId: filterAccountId !== 'All' ? filterAccountId : undefined,
        take: 20,
      })
      setTransactions(response.items)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load transactions'))
    } finally {
      setLoadingTransactions(false)
    }
  }

  useEffect(() => {
    if (!DEMO_USER_ID) {
      return
    }

    async function loadMeta() {
      try {
        setLoadingMeta(true)
        setError(null)

        const [loadedAccounts, loadedAssets] = await Promise.all([
          investmentsService.getAccounts(DEMO_USER_ID),
          investmentsService.getAssets(),
        ])

        setAccounts(loadedAccounts)
        setAssets(loadedAssets)

        if (loadedAccounts.length > 0) {
          setAccountId((current) => current || loadedAccounts[0].id)
        }

        if (loadedAssets.length > 0) {
          const firstTradableAsset = loadedAssets.find((asset) => asset.type !== 'cash')
          setAssetId((current) => current || firstTradableAsset?.id || '')
        }
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Failed to load investment data'))
      } finally {
        setLoadingMeta(false)
      }
    }

    loadMeta().catch(console.error)
  }, [])

  useEffect(() => {
    if (availableAccounts.length === 0) {
      setAccountId('')
      return
    }

    if (!availableAccounts.some((account) => account.id === accountId)) {
      setAccountId(availableAccounts[0].id)
    }
  }, [accountId, availableAccounts])

  useEffect(() => {
    if (!requiresAsset) {
      return
    }

    if (!availableAssets.some((asset) => asset.id === assetId)) {
      setAssetId(availableAssets[0]?.id ?? '')
    }
  }, [assetId, availableAssets, requiresAsset])

  useEffect(() => {
    loadTransactions(listAccountId).catch(console.error)
  }, [listAccountId])

  useEffect(() => {
    if (mode === 'deposit' || mode === 'dividend') {
      setQuantity('')
      setPrice('')
      setFee('')
    }
  }, [mode])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!DEMO_USER_ID || !accountId) {
      setError('Please select an investment account')
      return
    }

    const numericAmount = requiresTradeFields
      ? computedAmount
      : Number(amount)

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Amount must be a positive number')
      return
    }

    if (requiresAsset && !assetId) {
      setError('Please select an asset')
      return
    }

    const payload = {
      accountId,
      assetId: requiresAsset ? assetId : undefined,
      type: mode,
      amount: numericAmount,
      quantity: requiresTradeFields ? Number(quantity) : undefined,
      price: requiresTradeFields ? Number(price) : undefined,
      fee: requiresTradeFields ? Number(fee || '0') : undefined,
      tradeTime: new Date(tradeTime).toISOString(),
      note: note || undefined,
    } as const

    try {
      setSubmitting(true)
      setError(null)
      setSuccessMessage(null)
      await investmentsService.createTransaction(DEMO_USER_ID, payload)
      setSuccessMessage(`${mode} saved`)
      setAmount('')
      setQuantity('')
      setPrice('')
      setFee('')
      setNote('')
      await loadTransactions(listAccountId)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save transaction'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!DEMO_USER_ID) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-2xl font-semibold">Investments</h1>
        <p className="text-red-600">
          VITE_DEMO_USER_ID is not set. Please set it in your .env file.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Investments</h1>
        <p className="max-w-3xl text-sm text-gray-600">
          Record the investment actions you actually care about day to day:
          deposit, buy, sell, and dividend. This page is intentionally focused
          on capture first and bookkeeping validation second.
        </p>
      </header>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          <strong>Error:</strong> {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-green-800">
          {successMessage}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-2">
            {(['deposit', 'buy', 'sell', 'dividend'] as InvestmentMode[]).map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${
                    mode === item
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {item}
                </button>
              ),
            )}
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Account
              </label>
              <select
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                disabled={loadingMeta || availableAccounts.length === 0}
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                {availableAccounts.length === 0 && <option value="">No account available</option>}
                {availableAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Trade time
              </label>
              <input
                type="datetime-local"
                value={tradeTime}
                onChange={(event) => setTradeTime(event.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            {requiresAsset && (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Asset
                </label>
                <select
                  value={assetId}
                  onChange={(event) => setAssetId(event.target.value)}
                  disabled={availableAssets.length === 0}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                >
                  {availableAssets.length === 0 && <option value="">No asset available</option>}
                  {availableAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.symbol} · {asset.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {requiresTradeFields && (
              <>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Fee
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={fee}
                    onChange={(event) => setFee(event.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {requiresTradeFields ? 'Computed amount' : 'Amount'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={
                  requiresTradeFields && computedAmount > 0
                    ? String(computedAmount)
                    : amount
                }
                onChange={(event) => setAmount(event.target.value)}
                disabled={requiresTradeFields}
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Note
              </label>
              <input
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={
                  mode === 'deposit'
                    ? 'e.g. Monthly funding'
                    : mode === 'dividend'
                    ? 'e.g. Cash dividend'
                    : 'e.g. Build position'
                }
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <div className="text-sm text-gray-600">
                {selectedAccount ? (
                  <span>
                    Posting to <strong>{selectedAccount.name}</strong>
                    {selectedAsset ? ` · ${selectedAsset.symbol}` : ''}
                  </span>
                ) : (
                  'Select an account to continue'
                )}
              </div>
              <button
                type="submit"
                disabled={submitting || !accountId}
                className={`rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white ${
                  submitting || !accountId
                    ? 'cursor-not-allowed bg-gray-400'
                    : 'hover:bg-blue-700'
                }`}
              >
                {submitting ? 'Saving...' : `Save ${mode}`}
              </button>
            </div>
          </form>
        </div>

        <aside className="rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">How this page works</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>Deposit records funding into an investment account.</li>
            <li>Buy and sell compute total amount from quantity, price, and fee.</li>
            <li>Dividend records cash income tied to an asset.</li>
            <li>Recent transactions stay visible so you can audit the feed.</li>
          </ul>
        </aside>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Recent transactions</h2>
            <p className="text-sm text-gray-600">
              Last 20 items from the investment feed.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              View account
            </label>
            <select
              value={listAccountId}
              onChange={(event) => setListAccountId(event.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="All">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingTransactions ? (
          <p className="text-sm text-gray-600">Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-gray-600">No investment transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-2 py-3 font-medium text-gray-600">Time</th>
                  <th className="px-2 py-3 font-medium text-gray-600">Type</th>
                  <th className="px-2 py-3 font-medium text-gray-600">Account</th>
                  <th className="px-2 py-3 font-medium text-gray-600">Asset</th>
                  <th className="px-2 py-3 font-medium text-gray-600">Amount</th>
                  <th className="px-2 py-3 font-medium text-gray-600">Details</th>
                  <th className="px-2 py-3 font-medium text-gray-600">Note</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100 align-top">
                    <td className="whitespace-nowrap px-2 py-3">
                      {new Date(transaction.tradeTime).toLocaleString()}
                    </td>
                    <td className="px-2 py-3 capitalize">{transaction.type}</td>
                    <td className="px-2 py-3">
                      {transaction.account?.name || transaction.accountId}
                    </td>
                    <td className="px-2 py-3">
                      {transaction.asset?.symbol || '-'}
                    </td>
                    <td className="px-2 py-3 font-mono">
                      {formatMoney(transaction.amount)}
                    </td>
                    <td className="px-2 py-3 text-gray-600">
                      {transaction.quantity
                        ? `${formatMoney(transaction.quantity)} @ ${formatMoney(
                            transaction.price,
                          )}${transaction.fee ? ` · fee ${formatMoney(transaction.fee)}` : ''}`
                        : '-'}
                    </td>
                    <td className="px-2 py-3">{transaction.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
