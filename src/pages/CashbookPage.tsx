// src/pages/CashbookPage.tsx
import { useEffect, useState } from 'react'

type GlAccount = {
  id: string
  name: string
  type: string
  currency: string
}

type GlEntry = {
  id: string
  date: string
  amount: number
  debitAccountName: string
  creditAccountName: string
}

export default function CashbookPage() {
  const [accounts, setAccounts] = useState<GlAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | ''>('')
  const [entries, setEntries] = useState<GlEntry[]>([])
  const [loading, setLoading] = useState(false)

  // TODO: put your real API base URL here
  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

  // Load GL accounts on mount
  useEffect(() => {
    async function loadAccounts() {
      // You may want to add query params to only fetch cash/bank type
      const res = await fetch(`${API_BASE}/gl/accounts`)
      const data = await res.json()
      setAccounts(data)
      if (data.length > 0) {
        setSelectedAccountId(data[0].id)
      }
    }
    loadAccounts().catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // API_BASE is stable, no need to include in deps

  // Load entries when selected account changes
  useEffect(() => {
    if (!selectedAccountId) return
    async function loadEntries() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          accountId: selectedAccountId,
          // TODO: optional: add from/to date filters
        })
        const res = await fetch(`${API_BASE}/gl/entries?` + params.toString())
        const data = await res.json()
        setEntries(data)
      } finally {
        setLoading(false)
      }
    }
    loadEntries().catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]) // API_BASE is stable, no need to include in deps

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold mb-4">Cashbook</h1>

      {/* Account selector */}
      <section className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Account
        </label>
        <select
          className="border rounded px-3 py-2 w-full max-w-sm"
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
        >
          {accounts.map((acct) => (
            <option key={acct.id} value={acct.id}>
              {acct.name} ({acct.currency})
            </option>
          ))}
        </select>
      </section>

      {/* TODO: add income/expense form here */}

      {/* Entries list */}
      <section className="mt-4">
        <h2 className="text-lg font-medium mb-2">Recent entries</h2>
        {loading && <p>Loading...</p>}
        {!loading && entries.length === 0 && <p>No entries yet.</p>}
        {!loading && entries.length > 0 && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Description</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b">
                  <td className="py-1">
                    {new Date(e.date).toLocaleDateString()}
                  </td>
                  <td className="py-1">
                    {/* You can customize how to show debit/credit side */}
                    {e.debitAccountName} → {e.creditAccountName}
                  </td>
                  <td className="py-1 text-right">
                    {e.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
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
