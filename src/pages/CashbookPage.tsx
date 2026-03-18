import { useEffect, useMemo, useState } from 'react'
import {
  cashbookService,
  type GlAccount,
  type GlEntry,
} from '../lib/cashbook.service'
import { useCurrentUserId } from '../app/current-user'

type FormMode = 'expense' | 'income' | 'transfer'

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

export default function CashbookPage() {
  const currentUserId = useCurrentUserId()
  const [accounts, setAccounts] = useState<GlAccount[]>([])
  const [entries, setEntries] = useState<GlEntry[]>([])
  const [mode, setMode] = useState<FormMode>('expense')
  const [cashAccountId, setCashAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [transferToAccountId, setTransferToAccountId] = useState('')
  const [entryFilterAccountId, setEntryFilterAccountId] = useState('All')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [memo, setMemo] = useState('')
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const assetAccounts = useMemo(
    () => accounts.filter((account) => account.type === 'asset'),
    [accounts],
  )

  const expenseAccounts = useMemo(
    () => accounts.filter((account) => account.type === 'expense'),
    [accounts],
  )

  const incomeAccounts = useMemo(
    () => accounts.filter((account) => account.type === 'income'),
    [accounts],
  )

  const categoryOptions = useMemo(
    () => (mode === 'expense' ? expenseAccounts : incomeAccounts),
    [expenseAccounts, incomeAccounts, mode],
  )

  const selectedCashAccount = useMemo(
    () => assetAccounts.find((account) => account.id === cashAccountId),
    [assetAccounts, cashAccountId],
  )

  const transferTargetOptions = useMemo(() => {
    if (!selectedCashAccount) {
      return []
    }

    return assetAccounts.filter(
      (account) =>
        account.id !== selectedCashAccount.id &&
        account.currency === selectedCashAccount.currency,
    )
  }, [assetAccounts, selectedCashAccount])

  const accountNameMap = useMemo(() => {
    const map: Record<string, string> = {}

    for (const account of accounts) {
      map[account.id] = account.name
    }

    return map
  }, [accounts])

  async function loadEntries(accountId: string) {
    if (!currentUserId) {
      return
    }

    setLoadingEntries(true)
    try {
      const loadedEntries = await cashbookService.getGlEntries(accountId)
      setEntries(loadedEntries)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load entries'))
    } finally {
      setLoadingEntries(false)
    }
  }

  useEffect(() => {
    if (!currentUserId) {
      return
    }

    async function loadAccounts() {
      try {
        setLoadingAccounts(true)
        setError(null)
        const [loadedExpenseAccounts, loadedIncomeAccounts, loadedAssetAccounts] =
          await Promise.all([
            cashbookService.getGlAccounts('expense'),
            cashbookService.getGlAccounts('income'),
            cashbookService.getGlAccounts('asset'),
          ])

        const loadedAccounts = [
          ...loadedExpenseAccounts,
          ...loadedIncomeAccounts,
          ...loadedAssetAccounts,
        ]

        setAccounts(loadedAccounts)

        if (loadedAssetAccounts.length > 0) {
          setCashAccountId((current) => current || loadedAssetAccounts[0].id)
        }
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Failed to load accounts'))
      } finally {
        setLoadingAccounts(false)
      }
    }

    loadAccounts().catch(console.error)
  }, [currentUserId])

  useEffect(() => {
    if (mode === 'transfer') {
      setCategoryId('')
      setTransferToAccountId((current) => {
        if (current && transferTargetOptions.some((account) => account.id === current)) {
          return current
        }

        return transferTargetOptions[0]?.id ?? ''
      })
      return
    }

    setTransferToAccountId('')
    setCategoryId((current) => {
      if (current && categoryOptions.some((account) => account.id === current)) {
        return current
      }

      return categoryOptions[0]?.id ?? ''
    })
  }, [categoryOptions, mode, transferTargetOptions])

  useEffect(() => {
    loadEntries(entryFilterAccountId).catch(console.error)
  }, [currentUserId, entryFilterAccountId])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!currentUserId || !selectedCashAccount) {
      setError('A cash or bank account is required')
      return
    }

    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Amount must be a positive number')
      return
    }

    if (mode !== 'transfer' && !categoryId) {
      setError(`Please select a ${mode} category`)
      return
    }

    if (mode === 'transfer' && !transferToAccountId) {
      setError('Please select the destination account')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      setSuccessMessage(null)

      const payloadBase = {
        amount: numericAmount,
        currency: selectedCashAccount.currency,
        date: new Date(date).toISOString(),
        memo: memo || undefined,
      }

      if (mode === 'expense') {
        await cashbookService.postExpense({
          ...payloadBase,
          payFromGlAccountId: selectedCashAccount.id,
          expenseGlAccountId: categoryId,
        })
        setSuccessMessage('Expense saved')
      } else if (mode === 'income') {
        await cashbookService.postIncome({
          ...payloadBase,
          receiveToGlAccountId: selectedCashAccount.id,
          incomeGlAccountId: categoryId,
        })
        setSuccessMessage('Income saved')
      } else {
        await cashbookService.postTransfer({
          ...payloadBase,
          fromGlAccountId: selectedCashAccount.id,
          toGlAccountId: transferToAccountId,
        })
        setSuccessMessage('Transfer saved')
      }

      setAmount('')
      setMemo('')
      await loadEntries(entryFilterAccountId)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save entry'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!currentUserId) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-2xl font-semibold">Cashbook</h1>
        <p className="text-red-600">
          VITE_DEMO_USER_ID is not set. Please set it in your .env file.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Cashbook</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Record daily expenses, income, and transfers without thinking in
          debit and credit. The ledger below stays available as a verification
          layer.
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

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode('expense')}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                mode === 'expense'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setMode('income')}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                mode === 'income'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-700'
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setMode('transfer')}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                mode === 'transfer'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              Transfer
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Cash / bank account
              </label>
              <select
                value={cashAccountId}
                onChange={(event) => setCashAccountId(event.target.value)}
                disabled={loadingAccounts || assetAccounts.length === 0}
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                {assetAccounts.length === 0 && <option value="">No cash accounts</option>}
                {assetAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            {mode === 'transfer' ? (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  To account
                </label>
                <select
                  value={transferToAccountId}
                  onChange={(event) => setTransferToAccountId(event.target.value)}
                  disabled={transferTargetOptions.length === 0}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                >
                  {transferTargetOptions.length === 0 && (
                    <option value="">No same-currency account available</option>
                  )}
                  {transferTargetOptions.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  {mode === 'expense' ? 'Expense category' : 'Income category'}
                </label>
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  disabled={categoryOptions.length === 0}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                >
                  {categoryOptions.length === 0 && <option value="">No category available</option>}
                  {categoryOptions.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Memo
              </label>
              <input
                type="text"
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                placeholder={
                  mode === 'expense'
                    ? 'e.g. Lunch, groceries'
                    : mode === 'income'
                    ? 'e.g. Salary, reimbursement'
                    : 'e.g. Move funds to brokerage'
                }
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <div className="text-sm text-gray-600">
                {selectedCashAccount ? (
                  <span>
                    Posting in <strong>{selectedCashAccount.currency}</strong>
                  </span>
                ) : (
                  'Select a cash or bank account to continue'
                )}
              </div>
              <button
                type="submit"
                disabled={submitting || !selectedCashAccount}
                className={`rounded px-4 py-2 text-sm font-medium text-white ${
                  submitting || !selectedCashAccount
                    ? 'cursor-not-allowed bg-gray-400'
                    : mode === 'expense'
                    ? 'bg-red-600 hover:bg-red-700'
                    : mode === 'income'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-slate-700 hover:bg-slate-800'
                }`}
              >
                {submitting
                  ? 'Saving...'
                  : mode === 'expense'
                  ? 'Save expense'
                  : mode === 'income'
                  ? 'Save income'
                  : 'Save transfer'}
              </button>
            </div>
          </form>
        </div>

        <aside className="rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">What this page does</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>Uses asset-type GL accounts as cash and bank accounts.</li>
            <li>Uses expense and income GL accounts as categories.</li>
            <li>Limits transfers to same-currency accounts to avoid bad entries.</li>
            <li>Keeps the ledger view visible so you can audit what was posted.</li>
          </ul>
        </aside>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Recent ledger entries</h2>
            <p className="text-sm text-gray-600">
              Use this as a validation view while the product flow is still
              maturing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              View account
            </label>
            <select
              value={entryFilterAccountId}
              onChange={(event) => setEntryFilterAccountId(event.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="All">All cash accounts</option>
              {assetAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingEntries ? (
          <p className="text-sm text-gray-600">Loading entries...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-gray-600">No entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-2 py-3 font-medium text-gray-600">Date</th>
                  <th className="px-2 py-3 font-medium text-gray-600">Memo</th>
                  <th className="px-2 py-3 font-medium text-gray-600">Source</th>
                  <th className="px-2 py-3 font-medium text-gray-600">Lines</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 align-top">
                    <td className="whitespace-nowrap px-2 py-3">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-3">{entry.memo || '-'}</td>
                    <td className="px-2 py-3 text-xs text-gray-500">
                      {entry.source || '-'}
                    </td>
                    <td className="px-2 py-3">
                      {entry.lines && entry.lines.length > 0 ? (
                        <ul className="space-y-1">
                          {entry.lines.map((line) => (
                            <li key={line.id} className="flex flex-wrap gap-2">
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
                                {line.side === 'debit' ? 'D' : 'C'}
                              </span>
                              <span>
                                {accountNameMap[line.glAccountId] ||
                                  line.glAccountName ||
                                  line.glAccountId}
                              </span>
                              <span className="font-mono text-gray-600">
                                {line.amount.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{' '}
                                {line.currency}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-400">No lines</span>
                      )}
                    </td>
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
