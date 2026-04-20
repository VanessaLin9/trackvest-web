import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCurrentUserId } from '../app/current-user'
import DataTable from '../components/DataTable'
import { useI18n } from '../i18n'
import {
  accountsService,
  ACCOUNT_TYPE_OPTIONS,
  BROKER_OPTIONS,
  CURRENCY_OPTIONS,
  SUPPORTED_BROKER,
  type Account,
  type AccountType,
  type Broker,
  type Currency,
  type SaveAccountPayload,
} from '../lib/accounts.service'
import { Card } from '../components/ui/Card'
import { getApiErrorMessage } from '../lib/errors'
import { formatAccountType, formatBroker } from '../lib/labels'

type AccountFormState = {
  name: string
  type: AccountType
  currency: Currency
  broker: Broker | ''
}

const DEFAULT_FORM: AccountFormState = {
  name: '',
  type: 'broker',
  currency: 'TWD',
  broker: '',
}

export default function Accounts() {
  const currentUserId = useCurrentUserId()
  const queryClient = useQueryClient()
  const { t } = useI18n()
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [form, setForm] = useState<AccountFormState>(DEFAULT_FORM)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const accountsQuery = useQuery({
    queryKey: ['accounts', currentUserId],
    queryFn: () => accountsService.getAccounts(),
    enabled: Boolean(currentUserId),
  })

  const accounts = accountsQuery.data ?? []

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  )

  const importReadyAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.type === 'broker' && account.broker === SUPPORTED_BROKER,
      ),
    [accounts],
  )

  useEffect(() => {
    if (!selectedAccount) {
      return
    }

    setForm({
      name: selectedAccount.name,
      type: selectedAccount.type,
      currency: selectedAccount.currency,
      broker:
        selectedAccount.type === 'broker' &&
        selectedAccount.broker === SUPPORTED_BROKER
          ? SUPPORTED_BROKER
          : '',
    })
  }, [selectedAccount])

  useEffect(() => {
    if (!selectedAccountId) {
      return
    }

    if (!accounts.some((account) => account.id === selectedAccountId)) {
      setSelectedAccountId(null)
      setForm(DEFAULT_FORM)
    }
  }, [accounts, selectedAccountId])

  const saveMutation = useMutation({
    mutationFn: (payload: SaveAccountPayload) =>
      selectedAccountId
        ? accountsService.updateAccount(selectedAccountId, payload)
        : accountsService.createAccount(payload),
    onSuccess: async (savedAccount) => {
      await queryClient.invalidateQueries({ queryKey: ['accounts', currentUserId] })
      setSelectedAccountId(savedAccount.id)
      setForm({
        name: savedAccount.name,
        type: savedAccount.type,
        currency: savedAccount.currency,
        broker:
          savedAccount.type === 'broker' &&
          savedAccount.broker === SUPPORTED_BROKER
            ? SUPPORTED_BROKER
            : '',
      })
      setErrorMessage(null)
      setSuccessMessage(
        selectedAccountId ? t('accounts.accountUpdated') : t('accounts.accountCreated'),
      )
    },
    onError: (error: unknown) => {
      setErrorMessage(getApiErrorMessage(error, t('accounts.failedToSave')))
    },
  })

  const isEditing = Boolean(selectedAccountId)
  const isBrokerType = form.type === 'broker'

  const handleTypeChange = (nextType: AccountType) => {
    setForm((current) => ({
      ...current,
      type: nextType,
      broker: nextType === 'broker' ? 'cathay' : '',
    }))
  }

  const handleSelectAccount = (account: Account) => {
    setSelectedAccountId(account.id)
    setSuccessMessage(null)
    setErrorMessage(null)
  }

  const handleCreateNew = () => {
    setSelectedAccountId(null)
    setForm(DEFAULT_FORM)
    setSuccessMessage(null)
    setErrorMessage(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const trimmedName = form.name.trim()
    if (!trimmedName) {
      setErrorMessage(t('accounts.accountNameRequired'))
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)

    await saveMutation.mutateAsync({
      name: trimmedName,
      type: form.type,
      currency: form.currency,
      broker: isBrokerType && form.broker ? SUPPORTED_BROKER : undefined,
    })
  }

  if (!currentUserId) {
    return (
      <div>
        <h1>{t('accounts.titleApiFallback')}</h1>
        <p className="text-red-600">
          {t('common.envDemoUserMissing')}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('accounts.title')}</h1>
        <p className="max-w-3xl text-sm text-gray-600">
          {t('accounts.subtitle')}
        </p>
        <p className="text-xs text-gray-500">
          {t('accounts.currentUser', { userId: currentUserId })}
        </p>
      </header>

      {errorMessage && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          <strong>{t('common.error')}:</strong> {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-green-800">
          {successMessage}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {isEditing ? t('accounts.editTitle') : t('accounts.createTitle')}
              </h2>
              <p className="text-sm text-gray-600">
                {t('accounts.editorDescription')}
              </p>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={handleCreateNew}
                className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('accounts.createNew')}
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('accounts.accountName')}
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder={t('accounts.accountNamePlaceholder')}
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {t('accounts.type')}
              </label>
              <select
                value={form.type}
                onChange={(event) =>
                  handleTypeChange(event.target.value as AccountType)
                }
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                {ACCOUNT_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {formatAccountType(type, t)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {t('accounts.currency')}
              </label>
              <select
                value={form.currency}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    currency: event.target.value as Currency,
                  }))
                }
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                {CURRENCY_OPTIONS.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>

            {isBrokerType && (
              <div className="space-y-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('accounts.broker')}
                </label>
                <select
                  value={form.broker}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      broker: event.target.value as Broker,
                    }))
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2"
                >
                  {BROKER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value
                        ? t('accounts.brokerOptionCathay')
                        : t('accounts.brokerOptionNone')}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  {t('accounts.brokerHint')}
                </p>
              </div>
            )}

            <div className="md:col-span-2 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
              {isBrokerType ? (
                <span>
                  {form.broker === SUPPORTED_BROKER
                    ? t('accounts.brokerImportReady')
                    : t('accounts.brokerManualOnly')}
                </span>
              ) : (
                <span>
                  {t('accounts.nonBrokerImportHint')}
                </span>
              )}
            </div>

            <div className="md:col-span-2 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {selectedAccount
                  ? t('accounts.editingAccount', { name: selectedAccount.name })
                  : t('accounts.creatingNewAccount')}
              </div>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className={`rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white ${
                  saveMutation.isPending
                    ? 'cursor-not-allowed bg-gray-400'
                    : 'hover:bg-blue-700'
                }`}
              >
                {saveMutation.isPending
                  ? t('common.saving')
                  : isEditing
                  ? t('common.saveChanges')
                  : t('accounts.createAction')}
              </button>
            </div>
          </form>
        </Card>

        <aside className="space-y-4">
          <Card as="section">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{t('accounts.accountsList')}</h2>
                <p className="text-sm text-gray-600">
                  {t('accounts.accountsListDescription')}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ['accounts', currentUserId] })
                }
                disabled={accountsQuery.isFetching}
                className={`rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 ${
                  accountsQuery.isFetching
                    ? 'cursor-not-allowed opacity-60'
                    : 'hover:bg-gray-50'
                }`}
              >
                {t('common.refresh')}
              </button>
            </div>

            {accountsQuery.isLoading ? (
              <div className="rounded bg-gray-50 px-4 py-6 text-center text-gray-600">
                {t('accounts.loadingAccounts')}
              </div>
            ) : accountsQuery.error ? (
              <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                {t('accounts.failedToLoadAccounts')}
              </div>
            ) : (
              <DataTable
                data={accounts}
                columns={[
                  { key: 'name', label: t('accounts.name') },
                  {
                    key: 'type',
                    label: t('accounts.type'),
                    render: (value) => formatAccountType(value, t),
                  },
                  { key: 'currency', label: t('accounts.currency') },
                  {
                    key: 'broker',
                    label: t('accounts.broker'),
                    render: (value) => formatBroker(value, t),
                  },
                  {
                    key: 'csvImport',
                    label: t('accounts.csvImport'),
                    render: (_value, row) =>
                      row.type === 'broker' && row.broker === SUPPORTED_BROKER
                        ? t('accounts.ready')
                        : t('accounts.notReady'),
                  },
                ]}
                onRowClick={handleSelectAccount}
              />
            )}
          </Card>

          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">{t('accounts.importReadiness')}</h2>
            {importReadyAccounts.length > 0 ? (
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  {t('accounts.importReadyCount', {
                    count: importReadyAccounts.length,
                  })}
                </p>
                <ul className="space-y-2">
                  {importReadyAccounts.map((account) => (
                    <li
                      key={account.id}
                      className="rounded border border-gray-200 bg-white px-3 py-2"
                    >
                      <strong>{account.name}</strong> · {formatBroker(account.broker, t)} ·{' '}
                      {account.currency}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-gray-700">
                {t('accounts.noImportReadyAccounts')}
              </p>
            )}
          </section>
        </aside>
      </section>
    </div>
  )
}
