import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  IMPORT_ERROR_CODES,
  investmentsService,
  type CreateTransactionPayload,
  type ImportCommitResponse,
  type ImportPreviewResponse,
  type ImportPreviewRow,
  type TransactionListItem,
} from '../lib/investments.service'
import { useAuthenticatedUser } from '../app/use-auth'
import { SUPPORTED_BROKER } from '../lib/accounts.service'
import { useI18n } from '../i18n'
import { ImportAliasRepairDialog } from '../components/ImportAliasRepairDialog'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { getApiErrorMessage, parseImportCommitRejection } from '../lib/errors'
import {
  formatFixed2Amount as formatMoney,
  formatDateOnly,
  toDateTimeLocalValue,
  getDefaultTradeTimeValue,
} from '../lib/formatters'
import { formatTransactionMode } from '../lib/labels'
import { queryKeys } from '../lib/query-keys'

const INVESTMENT_MODE_OPTIONS = ['deposit', 'buy', 'sell', 'dividend'] as const
type InvestmentMode = (typeof INVESTMENT_MODE_OPTIONS)[number]

function isPositiveNumber(value: string) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0
}

function isZeroOrPositiveNumber(value: string) {
  const numeric = Number(value || '0')
  return Number.isFinite(numeric) && numeric >= 0
}

function buildTransactionDetails(
  transaction: TransactionListItem,
  locale: string,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  const segments: string[] = []

  if (transaction.quantity) {
    segments.push(
      t('transactions.detailQuantityPrice', {
        quantity: formatMoney(transaction.quantity, locale),
        price: formatMoney(transaction.price, locale),
      }),
    )
  }

  if (transaction.fee && Number(transaction.fee) > 0) {
    segments.push(
      t('transactions.detailFee', {
        value: formatMoney(transaction.fee, locale),
      }),
    )
  }

  if (transaction.tax && Number(transaction.tax) > 0) {
    segments.push(
      t('transactions.detailTax', {
        value: formatMoney(transaction.tax, locale),
      }),
    )
  }

  return segments.length > 0 ? segments.join(' · ') : '-'
}

function isEditableTransactionType(
  type: TransactionListItem['type'],
): type is InvestmentMode {
  return INVESTMENT_MODE_OPTIONS.includes(type as InvestmentMode)
}

function importStatusBadgeClass(status: ImportPreviewRow['status']) {
  if (status === 'ready') {
    return 'border-green-200 bg-green-50 text-green-800'
  }
  if (status === 'skipped') {
    return 'border-slate-200 bg-slate-50 text-slate-700'
  }
  if (status === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-900'
  }
  return 'border-red-200 bg-red-50 text-red-800'
}

function formatImportStatusLabel(
  status: ImportPreviewRow['status'],
  t: (key: string) => string,
) {
  if (status === 'ready') {
    return t('transactions.importStatusReady')
  }
  if (status === 'skipped') {
    return t('transactions.importStatusSkipped')
  }
  if (status === 'warning') {
    return t('transactions.importStatusWarning')
  }
  return t('transactions.importStatusError')
}

function rowHasAliasNotFound(row: ImportPreviewRow) {
  return row.errors.some(
    (issue) => issue.code === IMPORT_ERROR_CODES.ASSET_ALIAS_NOT_FOUND,
  )
}

function formatPreviewTrade(
  row: ImportPreviewRow,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  if (!row.normalizedTransaction) {
    return '-'
  }

  const { type, quantity, unitPrice } = row.normalizedTransaction
  return `${formatTransactionMode(type, t)} · ${quantity} @ ${unitPrice}`
}

function formatPreviewAsset(row: ImportPreviewRow, t: (key: string) => string) {
  if (row.resolvedAsset) {
    return `${row.resolvedAsset.symbol} · ${row.resolvedAsset.name}`
  }
  return `${row.rawAssetName} (${t('transactions.previewUnresolvedAsset')})`
}

export default function Transactions() {
  const currentUserId = useAuthenticatedUser().id
  const queryClient = useQueryClient()
  const { t, locale } = useI18n()

  const accountsQuery = useQuery({
    queryKey: queryKeys.accounts.all(currentUserId),
    queryFn: () => investmentsService.getAccounts(),
    enabled: Boolean(currentUserId),
  })
  const assetsQuery = useQuery({
    queryKey: queryKeys.assets.lookup(currentUserId),
    queryFn: () => investmentsService.getAssets(),
    enabled: Boolean(currentUserId),
  })

  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data])
  const assets = useMemo(() => assetsQuery.data ?? [], [assetsQuery.data])
  const loadingMeta = accountsQuery.isLoading || assetsQuery.isLoading

  const [mode, setMode] = useState<InvestmentMode>('deposit')
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [accountId, setAccountId] = useState('')
  const [assetId, setAssetId] = useState('')
  const [listAccountId, setListAccountId] = useState('All')
  const [amount, setAmount] = useState('')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [fee, setFee] = useState('')
  const [tax, setTax] = useState('')
  const [brokerOrderNo, setBrokerOrderNo] = useState('')
  const [tradeTime, setTradeTime] = useState(getDefaultTradeTimeValue)
  const [note, setNote] = useState('')
  const [importAccountId, setImportAccountId] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importCsvContent, setImportCsvContent] = useState<string | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreviewResponse | null>(
    null,
  )
  const [importCommitResult, setImportCommitResult] =
    useState<ImportCommitResponse | null>(null)
  const [aliasRepairRawName, setAliasRepairRawName] = useState<string | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const transactionsQuery = useQuery({
    queryKey: queryKeys.transactions.list(currentUserId, listAccountId),
    queryFn: () =>
      investmentsService.getTransactions({
        accountId: listAccountId !== 'All' ? listAccountId : undefined,
        take: 20,
      }),
    enabled: Boolean(currentUserId),
  })
  const transactions = transactionsQuery.data?.items ?? []
  const loadingTransactions = transactionsQuery.isLoading

  // Surface query load failures next to the existing form/mutation error banner.
  // Keeping load errors derived (vs. copied into `error` state) means retries
  // automatically clear the banner once the query succeeds.
  const loadErrorMessage = useMemo(() => {
    const metaError = accountsQuery.error ?? assetsQuery.error
    if (metaError) {
      return getApiErrorMessage(metaError, t('transactions.failedToLoadData'))
    }
    if (transactionsQuery.error) {
      return getApiErrorMessage(
        transactionsQuery.error,
        t('transactions.failedToLoadTransactions'),
      )
    }
    return null
  }, [accountsQuery.error, assetsQuery.error, transactionsQuery.error, t])
  const displayedError = error ?? loadErrorMessage

  const availableAccounts = useMemo(
    () =>
      accounts.filter((account) => account.type !== 'cash' || mode === 'deposit'),
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
  const importAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.type === 'broker' && account.broker === SUPPORTED_BROKER,
      ),
    [accounts],
  )

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === assetId),
    [assetId, assets],
  )
  const requiresAsset = mode === 'buy' || mode === 'sell' || mode === 'dividend'
  const requiresTradeFields = mode === 'buy' || mode === 'sell'
  const hasTradableAssets = availableAssets.length > 0
  const isEditing = Boolean(selectedTransactionId)

  const computedAmount = useMemo(() => {
    const numericQuantity = Number(quantity)
    const numericPrice = Number(price)
    const numericFee = Number(fee || '0')
    const numericTax = Number(tax || '0')

    if (!requiresTradeFields) {
      return Number(amount || '0')
    }

    if (!Number.isFinite(numericQuantity) || !Number.isFinite(numericPrice)) {
      return 0
    }

    const gross = numericQuantity * numericPrice
    return mode === 'buy'
      ? gross + numericFee + numericTax
      : gross - numericFee - numericTax
  }, [amount, fee, mode, price, quantity, requiresTradeFields, tax])

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
    if (importAccounts.length === 0) {
      setImportAccountId('')
      return
    }

    if (!importAccounts.some((account) => account.id === importAccountId)) {
      const selectedBroker =
        selectedAccount?.type === 'broker' &&
        selectedAccount.broker === SUPPORTED_BROKER
          ? selectedAccount.id
          : undefined
      setImportAccountId(selectedBroker || importAccounts[0].id)
    }
  }, [importAccountId, importAccounts, selectedAccount])

  useEffect(() => {
    if (!requiresAsset) {
      return
    }

    if (!availableAssets.some((asset) => asset.id === assetId)) {
      setAssetId(availableAssets[0]?.id ?? '')
    }
  }, [assetId, availableAssets, requiresAsset])

  useEffect(() => {
    if (mode === 'deposit' || mode === 'dividend') {
      setQuantity('')
      setPrice('')
      setFee('')
      setTax('')
    }
  }, [mode])

  const resetForm = () => {
    setSelectedTransactionId(null)
    setAmount('')
    setQuantity('')
    setPrice('')
    setFee('')
    setTax('')
    setBrokerOrderNo('')
    setTradeTime(getDefaultTradeTimeValue())
    setNote('')
  }

  const startEditingTransaction = (transaction: TransactionListItem) => {
    if (!isEditableTransactionType(transaction.type)) {
      setError(
        t('transactions.editUnsupported', {
          type: transaction.type,
        }),
      )
      setSuccessMessage(null)
      return
    }

    setSelectedTransactionId(transaction.id)
    setMode(transaction.type)
    setAccountId(transaction.accountId)
    setAssetId(transaction.assetId ?? '')
    setAmount(String(Number(transaction.amount)))
    setQuantity(
      transaction.quantity === null || transaction.quantity === undefined
        ? ''
        : String(transaction.quantity),
    )
    setPrice(
      transaction.price === null || transaction.price === undefined
        ? ''
        : String(transaction.price),
    )
    setFee(
      transaction.fee === null || transaction.fee === undefined
        ? ''
        : String(transaction.fee),
    )
    setTax(
      transaction.tax === null || transaction.tax === undefined
        ? ''
        : String(transaction.tax),
    )
    setBrokerOrderNo(transaction.brokerOrderNo ?? '')
    setTradeTime(toDateTimeLocalValue(transaction.tradeTime))
    setNote(transaction.note ?? '')
    setError(null)
    setSuccessMessage(null)
  }

  const validateForm = () => {
    if (!currentUserId || !accountId) {
      return t('transactions.accountRequired')
    }

    if (requiresAsset && !hasTradableAssets) {
      return t('transactions.noAssetAvailable')
    }

    if (!tradeTime || Number.isNaN(new Date(tradeTime).getTime())) {
      return t('transactions.validTradeTime')
    }

    if (requiresAsset && !assetId) {
      return t('transactions.assetRequired')
    }

    if (requiresTradeFields) {
      if (!isPositiveNumber(quantity)) {
        return t('transactions.quantityPositive', {
          mode,
        })
      }

      if (!isPositiveNumber(price)) {
        return t('transactions.pricePositive', {
          mode,
        })
      }
    }

    if (!isZeroOrPositiveNumber(fee)) {
      return t('transactions.feeValid')
    }

    if (!isZeroOrPositiveNumber(tax)) {
      return t('transactions.taxValid')
    }

    const numericAmount = requiresTradeFields ? computedAmount : Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return t('transactions.amountPositive')
    }

    return null
  }

  // Any write to transactions also invalidates the portfolio scope so the
  // Dashboard's summary/holdings/trend panels refresh to reflect the change.
  const invalidateTransactionScopes = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.all(currentUserId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.portfolio.all(),
      }),
    ])
  }

  const saveTransactionMutation = useMutation({
    mutationFn: async (payload: CreateTransactionPayload) => {
      if (selectedTransactionId) {
        return {
          transaction: await investmentsService.updateTransaction(
            selectedTransactionId,
            payload,
          ),
          wasEditing: true,
        }
      }
      return {
        transaction: await investmentsService.createTransaction(payload),
        wasEditing: false,
      }
    },
    onSuccess: async ({ transaction, wasEditing }) => {
      setError(null)
      setSuccessMessage(
        wasEditing
          ? t('transactions.updated', { mode: formatTransactionMode(mode, t) })
          : t('transactions.saved', { mode: formatTransactionMode(mode, t) }),
      )
      if (wasEditing) {
        startEditingTransaction(transaction)
      } else {
        resetForm()
      }
      await invalidateTransactionScopes()
    },
    onError: (err: unknown) => {
      setError(getApiErrorMessage(err, t('transactions.failedToSave')))
    },
  })

  const deleteTransactionMutation = useMutation({
    mutationFn: (transaction: TransactionListItem) =>
      investmentsService
        .removeTransaction(transaction.id)
        .then(() => transaction),
    onSuccess: async (transaction) => {
      if (selectedTransactionId === transaction.id) {
        resetForm()
      }
      setError(null)
      setSuccessMessage(
        t('transactions.deleted', {
          type: formatTransactionMode(transaction.type, t),
        }),
      )
      await invalidateTransactionScopes()
    },
    onError: (err: unknown) => {
      setError(getApiErrorMessage(err, t('transactions.failedToDelete')))
    },
  })
  const deletingTransactionId = deleteTransactionMutation.isPending
    ? deleteTransactionMutation.variables?.id ?? null
    : null

  const resetImportFlow = () => {
    setImportCsvContent(null)
    setImportPreview(null)
    setImportCommitResult(null)
  }

  const previewImportMutation = useMutation({
    mutationFn: (args: { accountId: string; csvContent: string }) =>
      investmentsService.previewImportTransactions(args),
    onSuccess: (result) => {
      setImportPreview(result)
      setImportCommitResult(null)
      setSuccessMessage(null)
      if (!result.canCommit) {
        setError(t('transactions.previewBlocked'))
      } else {
        setError(null)
      }
    },
    onError: (err: unknown) => {
      resetImportFlow()
      setError(getApiErrorMessage(err, t('transactions.failedToImport')))
    },
  })

  const commitImportMutation = useMutation({
    mutationFn: (args: { accountId: string; csvContent: string }) =>
      investmentsService.commitImportTransactions(args),
    onSuccess: async (result) => {
      setImportCommitResult(result)
      setImportPreview(null)
      setImportCsvContent(null)
      setImportFile(null)
      setError(null)
      setSuccessMessage(
        t('transactions.importedCount', {
          count: result.successCount,
        }),
      )
      await invalidateTransactionScopes()
    },
    onError: async (err: unknown) => {
      const rejection = parseImportCommitRejection(err)
      if (rejection) {
        setImportPreview(rejection.preview)
        setImportCommitResult(null)
        setSuccessMessage(null)
        if (rejection.errorCode === 'COMMIT_NOT_ALLOWED_WITH_ERRORS') {
          setError(t('transactions.previewBlocked'))
          return
        }
        if (rejection.errorCode === 'IMPORT_COMMIT_FAILED') {
          setError(
            t('transactions.commitFailedPartial', {
              successCount: rejection.successCount,
            }),
          )
          if (rejection.successCount > 0) {
            await invalidateTransactionScopes()
          }
          return
        }
      }
      setError(getApiErrorMessage(err, t('transactions.failedToImport')))
    },
  })

  const importBusy =
    previewImportMutation.isPending || commitImportMutation.isPending

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    if (isEditing && !selectedTransactionId) {
      setError(t('transactions.noTransactionSelected'))
      return
    }

    setError(null)
    setSuccessMessage(null)

    saveTransactionMutation.mutate({
      accountId,
      assetId: requiresAsset ? assetId : undefined,
      type: mode,
      amount: requiresTradeFields ? computedAmount : Number(amount),
      quantity: requiresTradeFields ? Number(quantity) : undefined,
      price: requiresTradeFields ? Number(price) : undefined,
      fee: requiresTradeFields ? Number(fee || '0') : undefined,
      tax: requiresTradeFields ? Number(tax || '0') : undefined,
      brokerOrderNo: requiresAsset ? brokerOrderNo.trim() || undefined : undefined,
      tradeTime: new Date(tradeTime).toISOString(),
      note: note || undefined,
    })
  }

  const handleSoftDelete = (transaction: TransactionListItem) => {
    if (
      !window.confirm(
        t('transactions.softDeleteConfirm', {
          type: formatTransactionMode(transaction.type, t),
        }),
      )
    ) {
      return
    }

    setError(null)
    setSuccessMessage(null)
    deleteTransactionMutation.mutate(transaction)
  }

  const validateImport = () => {
    if (!currentUserId) {
      return t('common.envDemoUserMissing')
    }

    if (!importAccountId) {
      return t('transactions.importAccountRequired')
    }

    if (!importFile) {
      return t('transactions.importFileRequired')
    }

    const loweredName = importFile.name.toLowerCase()
    if (
      !loweredName.endsWith('.csv') &&
      !loweredName.endsWith('.tsv') &&
      !loweredName.endsWith('.txt')
    ) {
      return t('transactions.importFileType')
    }

    if (importFile.size === 0) {
      return t('transactions.importFileEmpty')
    }

    return null
  }

  const handlePreviewImport = async (event: React.FormEvent) => {
    event.preventDefault()

    const validationError = validateImport()
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setSuccessMessage(null)
    setImportCommitResult(null)

    const csvContent = await importFile!.text()
    if (!csvContent.trim()) {
      setError(t('transactions.importFileEmpty'))
      return
    }

    setImportCsvContent(csvContent)
    previewImportMutation.mutate({
      accountId: importAccountId,
      csvContent,
    })
  }

  const handleCommitImport = () => {
    if (!importCsvContent || !importPreview?.canCommit) {
      return
    }

    setError(null)
    setSuccessMessage(null)
    commitImportMutation.mutate({
      accountId: importAccountId,
      csvContent: importCsvContent,
    })
  }

  const handleAliasRepairSuccess = () => {
    setAliasRepairRawName(null)
    if (!importAccountId || !importCsvContent) {
      return
    }

    setError(null)
    setSuccessMessage(null)
    previewImportMutation.mutate({
      accountId: importAccountId,
      csvContent: importCsvContent,
    })
  }

  if (!currentUserId) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-2xl font-semibold">{t('transactions.title')}</h1>
        <p className="text-red-600">
          {t('common.envDemoUserMissing')}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('transactions.title')}</h1>
        <p className="max-w-3xl text-sm text-gray-600">
          {t('transactions.subtitle')}
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

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {isEditing
                    ? t('transactions.editTitle')
                    : t('transactions.createTitle')}
                </h2>
                <p className="text-sm text-gray-600">
                  {isEditing
                    ? t('transactions.editDescription')
                    : t('transactions.createDescription')}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {INVESTMENT_MODE_OPTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMode(item)}
                    disabled={isEditing}
                    className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${
                      mode === item
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700'
                    } ${
                      isEditing ? 'cursor-not-allowed opacity-60' : ''
                    }`}
                  >
                    {formatTransactionMode(item, t)}
                  </button>
                ))}
              </div>

              {isEditing && (
                <p className="text-xs text-gray-500">
                  {t('transactions.typeLocked')}
                </p>
              )}
            </div>

          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor="investment-account"
                className="block text-sm font-medium text-gray-700"
              >
                {t('transactions.account')}
              </label>
              <select
                id="investment-account"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                disabled={loadingMeta || availableAccounts.length === 0}
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                {availableAccounts.length === 0 && (
                  <option value="">{t('transactions.noAccountAvailable')}</option>
                )}
                {availableAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="investment-trade-time"
                className="block text-sm font-medium text-gray-700"
              >
                {t('transactions.tradeTime')}
              </label>
              <input
                id="investment-trade-time"
                type="datetime-local"
                value={tradeTime}
                onChange={(event) => setTradeTime(event.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            {requiresAsset && (
              <div className="space-y-1">
                <label
                  htmlFor="investment-asset"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('transactions.asset')}
                </label>
                <select
                  id="investment-asset"
                  value={assetId}
                  onChange={(event) => setAssetId(event.target.value)}
                  disabled={!hasTradableAssets}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                >
                  {!hasTradableAssets && (
                    <option value="">{t('transactions.noAssetOption')}</option>
                  )}
                  {availableAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.symbol} · {asset.name}
                    </option>
                  ))}
                </select>
                {!hasTradableAssets && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                    {t('transactions.assetMissingHintPrefix')}{' '}
                    <Link
                      to="/assets"
                      className="font-medium underline underline-offset-2"
                    >
                      {t('routes.assets')}
                    </Link>{' '}
                    {t('transactions.assetMissingHintAfter')}
                  </div>
                )}
              </div>
            )}

            {requiresTradeFields && (
              <>
                <div className="space-y-1">
                  <label
                    htmlFor="investment-quantity"
                    className="block text-sm font-medium text-gray-700"
                  >
                    {t('transactions.quantity')}
                  </label>
                  <input
                    id="investment-quantity"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="investment-price"
                    className="block text-sm font-medium text-gray-700"
                  >
                    {t('transactions.price')}
                  </label>
                  <input
                    id="investment-price"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="investment-fee"
                    className="block text-sm font-medium text-gray-700"
                  >
                    {t('transactions.fee')}
                  </label>
                  <input
                    id="investment-fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={fee}
                    onChange={(event) => setFee(event.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="investment-tax"
                    className="block text-sm font-medium text-gray-700"
                  >
                    {t('transactions.tax')}
                  </label>
                  <input
                    id="investment-tax"
                    type="number"
                    step="0.01"
                    min="0"
                    value={tax}
                    onChange={(event) => setTax(event.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label
                htmlFor="investment-amount"
                className="block text-sm font-medium text-gray-700"
              >
                {requiresTradeFields
                  ? t('transactions.computedAmount')
                  : t('transactions.amount')}
              </label>
              <input
                id="investment-amount"
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

            {requiresAsset && (
              <div className="space-y-1 md:col-span-2">
                <label
                  htmlFor="investment-broker-order-no"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('transactions.brokerOrderNo')}
                </label>
                <input
                  id="investment-broker-order-no"
                  type="text"
                  value={brokerOrderNo}
                  onChange={(event) => setBrokerOrderNo(event.target.value)}
                  placeholder={t('transactions.brokerOrderNoPlaceholder')}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
                <p className="text-xs text-gray-500">
                  {t('transactions.brokerOrderNoHint')}
                </p>
              </div>
            )}

            <div className="space-y-1 md:col-span-2">
              <label
                htmlFor="investment-note"
                className="block text-sm font-medium text-gray-700"
              >
                {t('transactions.note')}
              </label>
              <input
                id="investment-note"
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={
                  mode === 'deposit'
                    ? t('transactions.noteDepositPlaceholder')
                    : mode === 'dividend'
                    ? t('transactions.noteDividendPlaceholder')
                    : mode === 'sell'
                    ? t('transactions.noteSellPlaceholder')
                    : t('transactions.noteBuyPlaceholder')
                }
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <div className="text-sm text-gray-600">
                {selectedAccount ? (
                  <span>
                    {t('transactions.postingTo')}{' '}
                    <strong>{selectedAccount.name}</strong>
                    {selectedAsset ? ` · ${selectedAsset.symbol}` : ''}
                  </span>
                ) : (
                  t('transactions.selectAccountToContinue')
                )}
              </div>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <Button variant="secondary" onClick={resetForm}>
                    {t('common.cancel')}
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={
                    saveTransactionMutation.isPending ||
                    !accountId ||
                    (requiresAsset && !hasTradableAssets)
                  }
                >
                  {saveTransactionMutation.isPending
                    ? t('common.saving')
                    : isEditing
                    ? t('common.saveChanges')
                    : t('transactions.saveMode', {
                        mode: formatTransactionMode(mode, t),
                      })}
                </Button>
              </div>
            </div>
          </form>
        </Card>

        <aside className="space-y-4">
          <Card as="section">
            <h2 className="mb-3 text-lg font-semibold">{t('transactions.importCsv')}</h2>
            <p className="mb-4 text-sm text-gray-600">
              {t('transactions.importCsvDescriptionBefore')}{' '}
              <Link to="/accounts" className="font-medium text-blue-700 underline">
                {t('routes.accounts')}
              </Link>
              {' '}
              {t('transactions.importCsvDescriptionAfter')}
            </p>

            {importAccounts.length === 0 && (
              <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {t('transactions.noImportAccounts')}
              </div>
            )}

            <form onSubmit={handlePreviewImport} className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="import-account-id"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('transactions.importAccount')}
                </label>
                <select
                  id="import-account-id"
                  value={importAccountId}
                  onChange={(event) => {
                    setImportAccountId(event.target.value)
                    resetImportFlow()
                  }}
                  disabled={importAccounts.length === 0 || importBusy}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                >
                  {importAccounts.length === 0 && (
                    <option value="">{t('transactions.noImportAccountOption')}</option>
                  )}
                  {importAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="import-file"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('transactions.file')}
                </label>
                <input
                  id="import-file"
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={(event) => {
                    setImportFile(event.target.files?.[0] ?? null)
                    resetImportFlow()
                  }}
                  disabled={importBusy}
                  className="block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500">
                  {t('transactions.requiredColumns')}
                </p>
              </div>

              <Button
                variant="dark"
                type="submit"
                disabled={importBusy || importAccounts.length === 0}
              >
                {previewImportMutation.isPending
                  ? t('transactions.previewing')
                  : t('transactions.previewCsv')}
              </Button>
            </form>
          </Card>

          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">{t('transactions.howItWorks')}</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>{t('transactions.helpDeposit')}</li>
              <li>{t('transactions.helpBuy')}</li>
              <li>{t('transactions.helpSell')}</li>
              <li>{t('transactions.helpDividend')}</li>
              <li>{t('transactions.helpFifo')}</li>
              <li>{t('transactions.helpImport')}</li>
              <li>{t('transactions.helpFeed')}</li>
            </ul>
          </section>
        </aside>
      </section>

      {importPreview && (
        <Card as="section">
          <h2 className="mb-3 text-lg font-semibold">
            {t('transactions.importPreview')}
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            <div className="rounded border border-gray-200 bg-white px-3 py-2">
              <div className="text-gray-500">{t('transactions.rows')}</div>
              <div className="font-semibold">{importPreview.totalRows}</div>
            </div>
            <div className="rounded border border-green-200 bg-white px-3 py-2">
              <div className="text-gray-500">{t('transactions.readyRows')}</div>
              <div className="font-semibold text-green-700">
                {importPreview.readyCount}
              </div>
            </div>
            <div className="rounded border border-slate-200 bg-white px-3 py-2">
              <div className="text-gray-500">{t('transactions.skippedRows')}</div>
              <div className="font-semibold text-slate-700">
                {importPreview.skippedCount}
              </div>
            </div>
            <div className="rounded border border-red-200 bg-white px-3 py-2">
              <div className="text-gray-500">{t('transactions.errorRows')}</div>
              <div className="font-semibold text-red-700">
                {importPreview.errorCount}
              </div>
            </div>
            <div className="rounded border border-amber-200 bg-white px-3 py-2">
              <div className="text-gray-500">{t('transactions.warningRows')}</div>
              <div className="font-semibold text-amber-800">
                {importPreview.warningCount}
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="px-3 py-2 font-medium">
                    {t('transactions.previewColumnRow')}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t('transactions.previewColumnStatus')}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t('transactions.previewColumnAsset')}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t('transactions.previewColumnTrade')}
                  </th>
                  <th className="min-w-[16rem] px-3 py-2 font-medium">
                    {t('transactions.previewColumnIssues')}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t('transactions.previewColumnActions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {importPreview.rows.map((row) => {
                  const issues = [...row.errors, ...row.warnings]
                  const canRepairAlias = rowHasAliasNotFound(row)
                  return (
                    <tr
                      key={`preview-row-${row.row}`}
                      className="border-b border-gray-100 align-top"
                    >
                      <td className="px-3 py-2 font-medium">{row.row}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${importStatusBadgeClass(row.status)}`}
                        >
                          {formatImportStatusLabel(row.status, t)}
                        </span>
                      </td>
                      <td className="px-3 py-2">{formatPreviewAsset(row, t)}</td>
                      <td className="px-3 py-2">{formatPreviewTrade(row, t)}</td>
                      <td className="px-3 py-2">
                        {issues.length === 0 ? (
                          <span className="text-gray-500">-</span>
                        ) : (
                          <div className="space-y-1">
                            {issues.map((issue, index) => (
                              <div
                                key={`${row.row}-${issue.code}-${index}`}
                                className="text-gray-700"
                              >
                                <span className="font-medium">
                                  {t('transactions.rowError', {
                                    row: row.row,
                                    field: issue.field,
                                  })}
                                </span>
                                <div>{issue.message}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {canRepairAlias ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            disabled={importBusy}
                            onClick={() => setAliasRepairRawName(row.rawAssetName)}
                          >
                            {t('transactions.aliasRepairAction')}
                          </Button>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Button
              variant="dark"
              type="button"
              onClick={handleCommitImport}
              disabled={!importPreview.canCommit || importBusy}
            >
              {commitImportMutation.isPending
                ? t('transactions.committing')
                : t('transactions.commitImport')}
            </Button>
          </div>
        </Card>
      )}

      {importCommitResult && (
        <Card as="section">
          <h2 className="mb-3 text-lg font-semibold">
            {t('transactions.importCommitResult')}
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded border border-gray-200 bg-white px-3 py-2">
              <div className="text-gray-500">{t('transactions.rows')}</div>
              <div className="font-semibold">{importCommitResult.totalRows}</div>
            </div>
            <div className="rounded border border-green-200 bg-white px-3 py-2">
              <div className="text-gray-500">{t('transactions.success')}</div>
              <div className="font-semibold text-green-700">
                {importCommitResult.successCount}
              </div>
            </div>
            <div className="rounded border border-slate-200 bg-white px-3 py-2">
              <div className="text-gray-500">{t('transactions.skippedRows')}</div>
              <div className="font-semibold text-slate-700">
                {importCommitResult.skippedCount}
              </div>
            </div>
            <div className="rounded border border-red-200 bg-white px-3 py-2">
              <div className="text-gray-500">{t('transactions.failed')}</div>
              <div className="font-semibold text-red-700">
                {importCommitResult.failureCount}
              </div>
            </div>
          </div>
        </Card>
      )}

      <ImportAliasRepairDialog
        open={aliasRepairRawName !== null}
        rawAlias={aliasRepairRawName ?? ''}
        onClose={() => setAliasRepairRawName(null)}
        onSuccess={handleAliasRepairSuccess}
      />

      <Card as="section">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t('transactions.recentTransactions')}</h2>
            <p className="text-sm text-gray-600">
              {t('transactions.recentTransactionsDescription')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              {t('transactions.viewAccount')}
            </label>
            <select
              value={listAccountId}
              onChange={(event) => setListAccountId(event.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="All">{t('transactions.allAccounts')}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingTransactions ? (
          <p className="text-sm text-gray-600">{t('transactions.loadingTransactions')}</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-gray-600">{t('transactions.noTransactions')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-2 py-3 font-medium text-gray-600">{t('transactions.date')}</th>
                  <th className="px-2 py-3 font-medium text-gray-600">{t('transactions.type')}</th>
                  <th className="px-2 py-3 font-medium text-gray-600">{t('transactions.account')}</th>
                  <th className="px-2 py-3 font-medium text-gray-600">{t('transactions.asset')}</th>
                  <th className="px-2 py-3 font-medium text-gray-600">{t('transactions.amountColumn')}</th>
                  <th className="px-2 py-3 font-medium text-gray-600">{t('transactions.details')}</th>
                  <th className="px-2 py-3 font-medium text-gray-600">{t('transactions.orderNo')}</th>
                  <th className="px-2 py-3 font-medium text-gray-600">{t('transactions.note')}</th>
                  <th className="px-2 py-3 font-medium text-gray-600">{t('transactions.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    onClick={() => startEditingTransaction(transaction)}
                    className={`border-b border-gray-100 align-top ${
                      isEditableTransactionType(transaction.type)
                        ? 'cursor-pointer hover:bg-gray-50'
                        : ''
                    } ${
                      selectedTransactionId === transaction.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="whitespace-nowrap px-2 py-3">
                      {formatDateOnly(transaction.tradeTime, locale)}
                    </td>
                    <td className="px-2 py-3">
                      {formatTransactionMode(transaction.type, t)}
                    </td>
                    <td className="px-2 py-3">
                      {transaction.account?.name || transaction.accountId}
                    </td>
                    <td className="px-2 py-3">
                      {transaction.asset?.symbol || '-'}
                    </td>
                    <td className="px-2 py-3 font-mono">
                      {formatMoney(transaction.amount, locale)}
                    </td>
                    <td className="px-2 py-3 text-gray-600">
                      {buildTransactionDetails(transaction, locale, t)}
                    </td>
                    <td className="px-2 py-3 text-gray-600">
                      {transaction.brokerOrderNo || '-'}
                    </td>
                    <td className="px-2 py-3">{transaction.note || '-'}</td>
                    <td className="px-2 py-3">
                      {isEditableTransactionType(transaction.type) ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={(event) => {
                              event.stopPropagation()
                              startEditingTransaction(transaction)
                            }}
                            aria-label={t('transactions.editAria', {
                              type: formatTransactionMode(transaction.type, t),
                            })}
                            title={t('transactions.editAction')}
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 16 16"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M2 11.5V14h2.5L12 6.5 9.5 4 2 11.5Z" />
                              <path d="M8.5 5 11 7.5" />
                              <path d="M9.5 4 11 2.5 13.5 5 12 6.5" />
                            </svg>
                          </Button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleSoftDelete(transaction)
                            }}
                            aria-label={t('transactions.deleteAria', {
                              type: formatTransactionMode(transaction.type, t),
                            })}
                            title={t('transactions.deleteAction')}
                            disabled={deletingTransactionId === transaction.id}
                            className={`rounded border border-amber-300 p-1.5 text-amber-700 ${
                              deletingTransactionId === transaction.id
                                ? 'cursor-not-allowed opacity-60'
                                : 'hover:bg-amber-50'
                            }`}
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 16 16"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 4.5h10" />
                              <path d="M6 4.5V3h4v1.5" />
                              <path d="M5 6.5V12.5" />
                              <path d="M8 6.5V12.5" />
                              <path d="M11 6.5V12.5" />
                              <path d="M4 4.5 4.5 14h7L12 4.5" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {t('transactions.readOnlyHere')}
                        </span>
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
