import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cashbookService,
  type PostExpensePayload,
  type PostIncomePayload,
  type PostTransferPayload,
} from '../lib/cashbook.service'
import { useAuthenticatedUser } from '../app/use-auth'
import { useI18n } from '../i18n'
import { Card } from '../components/ui/Card'
import { getApiErrorMessage } from '../lib/errors'
import { queryKeys } from '../lib/query-keys'

type FormMode = 'expense' | 'income' | 'transfer'

type PostEntryVariables =
  | { mode: 'expense'; payload: PostExpensePayload }
  | { mode: 'income'; payload: PostIncomePayload }
  | { mode: 'transfer'; payload: PostTransferPayload }

export default function CashbookPage() {
  const currentUserId = useAuthenticatedUser().id
  const queryClient = useQueryClient()
  const { t, locale } = useI18n()

  const glAccountsQuery = useQuery({
    queryKey: queryKeys.cashbook.glAccounts(currentUserId),
    queryFn: async () => {
      const [expense, income, asset] = await Promise.all([
        cashbookService.getGlAccounts('expense'),
        cashbookService.getGlAccounts('income'),
        cashbookService.getGlAccounts('asset'),
      ])
      return [...expense, ...income, ...asset]
    },
    enabled: Boolean(currentUserId),
  })

  const accounts = useMemo(
    () => glAccountsQuery.data ?? [],
    [glAccountsQuery.data],
  )
  const loadingAccounts = glAccountsQuery.isLoading

  const [mode, setMode] = useState<FormMode>('expense')
  const [cashAccountId, setCashAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [transferToAccountId, setTransferToAccountId] = useState('')
  const [entryFilterAccountId, setEntryFilterAccountId] = useState('All')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [memo, setMemo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const glEntriesQuery = useQuery({
    queryKey: queryKeys.cashbook.glEntries.list(
      currentUserId,
      entryFilterAccountId,
    ),
    queryFn: () => cashbookService.getGlEntries(entryFilterAccountId),
    enabled: Boolean(currentUserId),
  })
  const entries = glEntriesQuery.data ?? []
  const loadingEntries = glEntriesQuery.isLoading

  // Surface query load failures in the existing error banner; resolved
  // automatically once the query retries successfully.
  const loadErrorMessage = useMemo(() => {
    if (glAccountsQuery.error) {
      return getApiErrorMessage(
        glAccountsQuery.error,
        t('cashbook.failedToLoadAccounts'),
      )
    }
    if (glEntriesQuery.error) {
      return getApiErrorMessage(
        glEntriesQuery.error,
        t('cashbook.failedToLoadEntries'),
      )
    }
    return null
  }, [glAccountsQuery.error, glEntriesQuery.error, t])
  const displayedError = error ?? loadErrorMessage

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

  // Default the cash account selection to the first asset account once the
  // account list loads; keep whatever the user picked thereafter.
  useEffect(() => {
    if (cashAccountId) {
      return
    }

    const firstAssetAccount = accounts.find((account) => account.type === 'asset')
    if (firstAssetAccount) {
      setCashAccountId(firstAssetAccount.id)
    }
  }, [accounts, cashAccountId])

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

  const postEntryMutation = useMutation({
    mutationFn: async (variables: PostEntryVariables) => {
      if (variables.mode === 'expense') {
        await cashbookService.postExpense(variables.payload)
      } else if (variables.mode === 'income') {
        await cashbookService.postIncome(variables.payload)
      } else {
        await cashbookService.postTransfer(variables.payload)
      }
      return variables.mode
    },
    onSuccess: async (postedMode) => {
      setError(null)
      setSuccessMessage(
        postedMode === 'expense'
          ? t('cashbook.expenseSaved')
          : postedMode === 'income'
          ? t('cashbook.incomeSaved')
          : t('cashbook.transferSaved'),
      )
      setAmount('')
      setMemo('')
      await queryClient.invalidateQueries({
        queryKey: queryKeys.cashbook.glEntries.all(currentUserId),
      })
    },
    onError: (err: unknown) => {
      setError(getApiErrorMessage(err, t('cashbook.failedToSaveEntry')))
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (!currentUserId || !selectedCashAccount) {
      setError(t('cashbook.cashAccountRequired'))
      return
    }

    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError(t('cashbook.amountMustBePositive'))
      return
    }

    if (mode !== 'transfer' && !categoryId) {
      setError(
        t('cashbook.categoryRequired', {
          mode:
            mode === 'expense'
              ? t('cashbook.categoryExpense')
              : t('cashbook.categoryIncome'),
        }),
      )
      return
    }

    if (mode === 'transfer' && !transferToAccountId) {
      setError(t('cashbook.destinationAccountRequired'))
      return
    }

    setError(null)
    setSuccessMessage(null)

    const payloadBase = {
      amount: numericAmount,
      currency: selectedCashAccount.currency,
      date: new Date(date).toISOString(),
      memo: memo || undefined,
    }

    if (mode === 'expense') {
      postEntryMutation.mutate({
        mode: 'expense',
        payload: {
          ...payloadBase,
          payFromGlAccountId: selectedCashAccount.id,
          expenseGlAccountId: categoryId,
        },
      })
    } else if (mode === 'income') {
      postEntryMutation.mutate({
        mode: 'income',
        payload: {
          ...payloadBase,
          receiveToGlAccountId: selectedCashAccount.id,
          incomeGlAccountId: categoryId,
        },
      })
    } else {
      postEntryMutation.mutate({
        mode: 'transfer',
        payload: {
          ...payloadBase,
          fromGlAccountId: selectedCashAccount.id,
          toGlAccountId: transferToAccountId,
        },
      })
    }
  }

  if (!currentUserId) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-2xl font-semibold">{t('cashbook.title')}</h1>
        <p className="text-red-600">
          {t('common.envDemoUserMissing')}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('cashbook.title')}</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          {t('cashbook.subtitle')}
        </p>
      </header>

      {displayedError && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          <strong>{t('common.error')}:</strong> {displayedError}
        </div>
      )}

      {successMessage && (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-green-800">
          {successMessage}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
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
              {t('cashbook.modeExpense')}
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
              {t('cashbook.modeIncome')}
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
              {t('cashbook.modeTransfer')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {t('cashbook.cashAccount')}
              </label>
              <select
                value={cashAccountId}
                onChange={(event) => setCashAccountId(event.target.value)}
                disabled={loadingAccounts || assetAccounts.length === 0}
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                {assetAccounts.length === 0 && (
                  <option value="">{t('cashbook.noCashAccounts')}</option>
                )}
                {assetAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {t('cashbook.date')}
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
                {t('cashbook.amount')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={t('cashbook.amountPlaceholder')}
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            {mode === 'transfer' ? (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  {t('cashbook.toAccount')}
                </label>
                <select
                  value={transferToAccountId}
                  onChange={(event) => setTransferToAccountId(event.target.value)}
                  disabled={transferTargetOptions.length === 0}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                >
                  {transferTargetOptions.length === 0 && (
                    <option value="">{t('cashbook.noSameCurrencyAccount')}</option>
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
                  {mode === 'expense'
                    ? t('cashbook.expenseCategory')
                    : t('cashbook.incomeCategory')}
                </label>
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  disabled={categoryOptions.length === 0}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                >
                  {categoryOptions.length === 0 && (
                    <option value="">{t('cashbook.noCategoryAvailable')}</option>
                  )}
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
                {t('cashbook.memo')}
              </label>
              <input
                type="text"
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                placeholder={
                  mode === 'expense'
                    ? t('cashbook.memoExpensePlaceholder')
                    : mode === 'income'
                    ? t('cashbook.memoIncomePlaceholder')
                    : t('cashbook.memoTransferPlaceholder')
                }
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <div className="text-sm text-gray-600">
                {selectedCashAccount ? (
                  <span>
                    {t('cashbook.postingInBefore')}{' '}
                    <strong>{selectedCashAccount.currency}</strong>{' '}
                    {t('cashbook.postingInAfter')}
                  </span>
                ) : (
                  t('cashbook.selectCashAccountToContinue')
                )}
              </div>
              <button
                type="submit"
                disabled={postEntryMutation.isPending || !selectedCashAccount}
                className={`rounded px-4 py-2 text-sm font-medium text-white ${
                  postEntryMutation.isPending || !selectedCashAccount
                    ? 'cursor-not-allowed bg-gray-400'
                    : mode === 'expense'
                    ? 'bg-red-600 hover:bg-red-700'
                    : mode === 'income'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-slate-700 hover:bg-slate-800'
                }`}
              >
                {postEntryMutation.isPending
                  ? t('common.saving')
                  : mode === 'expense'
                  ? t('cashbook.saveExpense')
                  : mode === 'income'
                  ? t('cashbook.saveIncome')
                  : t('cashbook.saveTransfer')}
              </button>
            </div>
          </form>
        </Card>

        <aside className="rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">{t('cashbook.pageDoesTitle')}</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>{t('cashbook.pageDoesOne')}</li>
            <li>{t('cashbook.pageDoesTwo')}</li>
            <li>{t('cashbook.pageDoesThree')}</li>
            <li>{t('cashbook.pageDoesFour')}</li>
          </ul>
        </aside>
      </section>

      <Card as="section">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t('cashbook.recentEntriesTitle')}</h2>
            <p className="text-sm text-gray-600">
              {t('cashbook.recentEntriesDescription')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              {t('cashbook.viewAccount')}
            </label>
            <select
              value={entryFilterAccountId}
              onChange={(event) => setEntryFilterAccountId(event.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="All">{t('cashbook.allCashAccounts')}</option>
              {assetAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingEntries ? (
          <p className="text-sm text-gray-600">{t('cashbook.loadingEntries')}</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-gray-600">{t('cashbook.noEntries')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-2 py-3 font-medium text-gray-600">{t('cashbook.date')}</th>
                  <th className="px-2 py-3 font-medium text-gray-600">{t('cashbook.memoColumn')}</th>
                  <th className="px-2 py-3 font-medium text-gray-600">{t('cashbook.source')}</th>
                  <th className="px-2 py-3 font-medium text-gray-600">{t('cashbook.lines')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 align-top">
                    <td className="whitespace-nowrap px-2 py-3">
                      {new Date(entry.date).toLocaleDateString(locale)}
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
                                {line.side === 'debit'
                                  ? t('cashbook.sideDebit')
                                  : t('cashbook.sideCredit')}
                              </span>
                              <span>
                                {accountNameMap[line.glAccountId] ||
                                  line.glAccountName ||
                                  line.glAccountId}
                              </span>
                              <span className="font-mono text-gray-600">
                                {line.amount.toLocaleString(locale, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{' '}
                                {line.currency}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-400">{t('cashbook.noLines')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
