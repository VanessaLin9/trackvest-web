import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  investmentsService,
  type Asset,
  type ImportTransactionsResponse,
  type TransactionListItem,
} from '../lib/investments.service'
import { useCurrentUserId } from '../app/current-user'
import { SUPPORTED_BROKER, type Account } from '../lib/accounts.service'
import { useI18n } from '../i18n'
import { Card } from '../components/ui/Card'
import { getApiErrorMessage } from '../lib/errors'
import {
  formatFixed2Amount as formatMoney,
  formatDateOnly,
  toDateTimeLocalValue,
  getDefaultTradeTimeValue,
} from '../lib/formatters'
import { formatTransactionMode } from '../lib/labels'

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

export default function Transactions() {
  const currentUserId = useCurrentUserId()
  const { t, locale } = useI18n()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [transactions, setTransactions] = useState<TransactionListItem[]>([])
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
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(
    null,
  )
  const [importAccountId, setImportAccountId] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importSubmitting, setImportSubmitting] = useState(false)
  const [importResult, setImportResult] =
    useState<ImportTransactionsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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

  async function loadTransactions(filterAccountId: string) {
    if (!currentUserId) {
      return
    }

    setLoadingTransactions(true)
    try {
      const response = await investmentsService.getTransactions({
        accountId: filterAccountId !== 'All' ? filterAccountId : undefined,
        take: 20,
      })
      setTransactions(response.items)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t('transactions.failedToLoadTransactions')))
    } finally {
      setLoadingTransactions(false)
    }
  }

  useEffect(() => {
    if (!currentUserId) {
      return
    }

    async function loadMeta() {
      try {
        setLoadingMeta(true)
        setError(null)

        const [loadedAccounts, loadedAssets] = await Promise.all([
          investmentsService.getAccounts(),
          investmentsService.getAssets(),
        ])

        setAccounts(loadedAccounts)
        setAssets(loadedAssets)

        if (loadedAccounts.length > 0) {
          setAccountId((current) => current || loadedAccounts[0].id)
        }

        if (loadedAssets.length > 0) {
          const firstTradableAsset = loadedAssets.find(
            (asset) => asset.type !== 'cash',
          )
          setAssetId((current) => current || firstTradableAsset?.id || '')
        }
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, t('transactions.failedToLoadData')))
      } finally {
        setLoadingMeta(false)
      }
    }

    loadMeta().catch(console.error)
  }, [currentUserId])

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
    loadTransactions(listAccountId).catch(console.error)
  }, [currentUserId, listAccountId])

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    const payload = {
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
    } as const

    try {
      setSubmitting(true)
      setError(null)
      setSuccessMessage(null)
      let savedTransaction: TransactionListItem
      if (isEditing) {
        if (!selectedTransactionId) {
          throw new Error(t('transactions.noTransactionSelected'))
        }
        savedTransaction = await investmentsService.updateTransaction(
          selectedTransactionId,
          payload,
        )
      } else {
        savedTransaction = await investmentsService.createTransaction(payload)
      }
      setSuccessMessage(
        isEditing
          ? t('transactions.updated', { mode: formatTransactionMode(mode, t) })
          : t('transactions.saved', { mode: formatTransactionMode(mode, t) }),
      )
      if (isEditing) {
        startEditingTransaction(savedTransaction)
      } else {
        resetForm()
      }
      await loadTransactions(listAccountId)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t('transactions.failedToSave')))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSoftDelete = async (transaction: TransactionListItem) => {
    if (
      !window.confirm(
        t('transactions.softDeleteConfirm', {
          type: formatTransactionMode(transaction.type, t),
        }),
      )
    ) {
      return
    }

    try {
      setDeletingTransactionId(transaction.id)
      setError(null)
      setSuccessMessage(null)
      await investmentsService.removeTransaction(transaction.id)
      if (selectedTransactionId === transaction.id) {
        resetForm()
      }
      setSuccessMessage(
        t('transactions.deleted', {
          type: formatTransactionMode(transaction.type, t),
        }),
      )
      await loadTransactions(listAccountId)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t('transactions.failedToDelete')))
    } finally {
      setDeletingTransactionId(null)
    }
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

  const handleImport = async (event: React.FormEvent) => {
    event.preventDefault()

    const validationError = validateImport()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setImportSubmitting(true)
      setError(null)
      setSuccessMessage(null)
      const csvContent = await importFile!.text()
      if (!csvContent.trim()) {
        setError(t('transactions.importFileEmpty'))
        return
      }

      const result = await investmentsService.importTransactions({
        accountId: importAccountId,
        csvContent,
      })

      setImportResult(result)
      if (result.successCount > 0) {
        setSuccessMessage(
          t('transactions.importedCount', {
            count: result.successCount,
          }),
        )
        await loadTransactions(listAccountId)
      } else {
        setSuccessMessage(null)
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t('transactions.failedToImport')))
    } finally {
      setImportSubmitting(false)
    }
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

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          <strong>{t('common.error')}:</strong> {error}
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
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    {t('common.cancel')}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={
                    submitting || !accountId || (requiresAsset && !hasTradableAssets)
                  }
                  className={`rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white ${
                    submitting || !accountId || (requiresAsset && !hasTradableAssets)
                      ? 'cursor-not-allowed bg-gray-400'
                      : 'hover:bg-blue-700'
                  }`}
                >
                  {submitting
                    ? t('common.saving')
                    : isEditing
                    ? t('common.saveChanges')
                    : t('transactions.saveMode', {
                        mode: formatTransactionMode(mode, t),
                      })}
                </button>
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

            <form onSubmit={handleImport} className="space-y-4">
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
                  onChange={(event) => setImportAccountId(event.target.value)}
                  disabled={importAccounts.length === 0 || importSubmitting}
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
                  onChange={(event) =>
                    setImportFile(event.target.files?.[0] ?? null)
                  }
                  disabled={importSubmitting}
                  className="block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500">
                  {t('transactions.requiredColumns')}
                </p>
              </div>

              <button
                type="submit"
                disabled={importSubmitting || importAccounts.length === 0}
                className={`rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white ${
                  importSubmitting || importAccounts.length === 0
                    ? 'cursor-not-allowed bg-gray-400'
                    : 'hover:bg-slate-700'
                }`}
              >
                {importSubmitting
                  ? t('transactions.importing')
                  : t('transactions.importCsv')}
              </button>
            </form>
          </Card>

          {importResult && (
            <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold">{t('transactions.importResult')}</h2>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded border border-gray-200 bg-white px-3 py-2">
                  <div className="text-gray-500">{t('transactions.rows')}</div>
                  <div className="font-semibold">{importResult.totalRows}</div>
                </div>
                <div className="rounded border border-green-200 bg-white px-3 py-2">
                  <div className="text-gray-500">{t('transactions.success')}</div>
                  <div className="font-semibold text-green-700">
                    {importResult.successCount}
                  </div>
                </div>
                <div className="rounded border border-red-200 bg-white px-3 py-2">
                  <div className="text-gray-500">{t('transactions.failed')}</div>
                  <div className="font-semibold text-red-700">
                    {importResult.failureCount}
                  </div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h3 className="text-sm font-medium text-gray-800">{t('transactions.errors')}</h3>
                  <div className="space-y-2">
                    {importResult.errors.map((item, index) => (
                      <div
                        key={`${item.row}-${item.field}-${index}`}
                        className="rounded border border-red-200 bg-white px-3 py-2 text-sm"
                      >
                        <div className="font-medium text-red-700">
                          {t('transactions.rowError', {
                            row: item.row,
                            field: item.field,
                          })}
                        </div>
                        <div className="text-gray-700">{item.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

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
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              startEditingTransaction(transaction)
                            }}
                            aria-label={t('transactions.editAria', {
                              type: formatTransactionMode(transaction.type, t),
                            })}
                            title={t('transactions.editAction')}
                            className="rounded border border-gray-300 p-1.5 text-gray-700 hover:bg-gray-50"
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
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleSoftDelete(transaction).catch(console.error)
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
