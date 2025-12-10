// src/pages/CashbookPage.tsx
import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

type GlAccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'

type GlAccount = {
  id: string
  userId: string
  name: string
  type: GlAccountType
  currency: string
  linkedAccountId?: string | null
}

// NOTE: This is a guess based on your docs.
// Adjust field names to match your real /gl/entries response.
type GlLine = {
  id: string
  glAccountId: string
  glAccountName?: string
  side: 'debit' | 'credit'
  amount: number
  currency: string
}

type GlEntry = {
  id: string
  userId: string
  date: string
  memo?: string | null
  source?: string
  refTxId?: string | null
  lines?: GlLine[]
}

type FormMode = 'expense' | 'income'

const DEMO_USER_ID = import.meta.env.VITE_DEMO_USER_ID

export default function CashbookPage() {
  const [accounts, setAccounts] = useState<GlAccount[]>([])
  const [entries, setEntries] = useState<GlEntry[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [mode, setMode] = useState<FormMode>('expense')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [memo, setMemo] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const headers = useMemo(
    () => ({
      'X-User-Id': DEMO_USER_ID || '',
    }),
    []
  )

  const assetAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'asset'),
    [accounts]
  )

  const expenseAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'expense'),
    [accounts]
  )

  const incomeAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'income'),
    [accounts]
  )

  // Build a map for accountId -> name (for rendering entry lines)
  const accountNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const a of accounts) {
      map[a.id] = a.name
    }
    return map
  }, [accounts])

  // Load GL accounts on mount
  useEffect(() => {
    async function loadAccounts() {
      try {
        setLoadingAccounts(true)
        setError(null)
        const expenseAccounts = await api.get<GlAccount[]>('/gl/accounts', { headers, params: { userId: DEMO_USER_ID, type: 'expense' } })
        const incomeAccounts = await api.get<GlAccount[]>('/gl/accounts', { headers, params: { userId: DEMO_USER_ID, type: 'income' } })
        setAccounts([...expenseAccounts.data, ...incomeAccounts.data])
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Failed to load accounts')
      } finally {
        setLoadingAccounts(false)
      }
    }
    loadAccounts().catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load entries whenever selectedAccountId changes
  useEffect(() => {
    if (!selectedAccountId) return

    async function loadEntries() {
      try {
        setLoadingEntries(true)
        setError(null)
        const res = await api.get<GlEntry[]>('/gl/entries', {
          headers,
          params: {
            accountId: selectedAccountId,
            // TODO: add from/to filters if you want
          },
        })
        setEntries(res.data)
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Failed to load entries')
      } finally {
        setLoadingEntries(false)
      }
    }

    loadEntries().catch(console.error)
  }, [selectedAccountId, headers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAccountId || !amount || !categoryId) return

    try {
      setSubmitting(true)
      setError(null)

      const numericAmount = Number(amount)
      if (Number.isNaN(numericAmount) || numericAmount <= 0) {
        setError('Amount must be a positive number')
        setSubmitting(false)
        return
      }

      const payloadBase = {
        userId: DEMO_USER_ID,
        amount: numericAmount,
        currency:
          assetAccounts.find((a) => a.id === selectedAccountId)?.currency ?? 'TWD',
        date: new Date(date).toISOString(),
        memo: memo || undefined,
      }

      let endpoint = ''
      let body: Record<string, unknown> = {}

      if (mode === 'expense') {
        endpoint = '/gl/expense'
        body = {
          ...payloadBase,
          payFromGlAccountId: selectedAccountId,
          expenseGlAccountId: categoryId,
        }
      } else {
        endpoint = '/gl/income'
        body = {
          ...payloadBase,
          receiveToGlAccountId: selectedAccountId,
          incomeGlAccountId: categoryId,
        }
      }

      await api.post(endpoint, body, { headers })

      // Reset basic fields
      setAmount('')
      setMemo('')

      // Reload entries after successful post
      const res = await api.get<GlEntry[]>('/gl/entries', {
        headers,
        params: { accountId: selectedAccountId },
      })
      setEntries(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to post entry')
    } finally {
      setSubmitting(false)
    }
  }

  if (!DEMO_USER_ID) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Cashbook</h1>
        <p className="text-red-600">
          VITE_DEMO_USER_ID is not set. Please set it in your .env file.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold mb-2">Cashbook</h1>
      <p className="text-sm text-gray-600 mb-4">
        Simple cash/bank bookkeeping using GL endpoints.
      </p>

      {error && (
        <div className="p-3 rounded bg-red-100 text-red-800">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Account selector */}
      <section className="space-y-2 border border-gray-200 rounded p-4">
        <h2 className="text-lg font-medium mb-2">Account</h2>

        {loadingAccounts ? (
          <p>Loading accounts...</p>
        ) : assetAccounts.length === 0 ? (
          <p className="text-sm text-gray-600">
            No asset-type GL accounts found. Please seed some cash/bank GL accounts first.
          </p>
        ) : (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Cash / Bank account
            </label>
            <select
              className="border rounded px-3 py-2 w-full max-w-md"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              {assetAccounts.map((acct) => (
                <option key={acct.id} value={acct.id}>
                  {acct.name} ({acct.currency})
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* Entry form */}
      <section className="space-y-3 border border-gray-200 rounded p-4">
        <h2 className="text-lg font-medium mb-2">New entry</h2>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setMode('expense')}
            className={`px-3 py-1 rounded text-sm border ${
              mode === 'expense'
                ? 'bg-red-50 text-red-700 border-red-300'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setMode('income')}
            className={`px-3 py-1 rounded text-sm border ${
              mode === 'income'
                ? 'bg-green-50 text-green-700 border-green-300'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Income
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {(mode === 'expense' ? expenseAccounts : incomeAccounts).map((acct) => (
                <option key={acct.id} value={acct.id}>
                  {acct.name}
                </option>
              ))}
            </select>
            {mode === 'expense' && expenseAccounts.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                No expense-type GL accounts. You may want to create some (e.g. Food, Rent).
              </p>
            )}
            {mode === 'income' && incomeAccounts.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                No income-type GL accounts. You may want to create some (e.g. Salary, Dividend).
              </p>
            )}
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Memo
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              placeholder={mode === 'expense' ? 'e.g. Lunch' : 'e.g. Salary (partial)'}
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting || !selectedAccountId}
              className={`px-4 py-2 rounded text-white text-sm ${
                submitting || !selectedAccountId
                  ? 'bg-gray-400 cursor-not-allowed'
                  : mode === 'expense'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {submitting
                ? 'Saving...'
                : mode === 'expense'
                ? 'Save expense'
                : 'Save income'}
            </button>
          </div>
        </form>
      </section>

      {/* Entries list */}
      <section className="space-y-2 border border-gray-200 rounded p-4">
        <h2 className="text-lg font-medium mb-2">Entries</h2>
        {loadingEntries ? (
          <p>Loading entries...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-gray-600">No entries yet.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-1">Date</th>
                <th className="text-left py-2 px-1">Memo</th>
                <th className="text-left py-2 px-1">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b align-top">
                  <td className="py-1 px-1 whitespace-nowrap">
                    {new Date(entry.date).toLocaleDateString()}
                  </td>
                  <td className="py-1 px-1">{entry.memo || '-'}</td>
                  <td className="py-1 px-1">
                    {entry.lines && entry.lines.length > 0 ? (
                      <ul className="space-y-0.5">
                        {entry.lines.map((line) => (
                          <li key={line.id}>
                            <span className="font-mono text-xs mr-1">
                              {line.side === 'debit' ? 'D' : 'C'}
                            </span>
                            <span className="mr-1">
                              {accountNameMap[line.glAccountId] ||
                                line.glAccountName ||
                                line.glAccountId}
                            </span>
                            <span className="font-mono">
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
                      <pre className="text-xs bg-gray-50 p-1 rounded overflow-x-auto">
                        {JSON.stringify(entry, null, 2)}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
