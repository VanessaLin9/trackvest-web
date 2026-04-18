import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import {
  assetsService,
  ASSET_CLASS_OPTIONS,
  ASSET_TYPE_OPTIONS,
  BASE_CURRENCY_OPTIONS,
  type Asset,
  type AssetClass,
  type AssetType,
  type GetAssetsParams,
} from '../lib/assets.service'
import {
  ASSET_NAME_MAX_LENGTH,
  ASSET_SYMBOL_MAX_LENGTH,
  isSafeAssetName,
  isSafeAssetSymbol,
  normalizeAssetNameInput,
  normalizeAssetSymbolInput,
  normalizeSupportedCurrencyInput,
  sanitizeStrictTextInput,
  sanitizeLightweightTextInput,
} from '../lib/input-safety'

type AssetFormState = {
  symbol: string
  name: string
  type: AssetType
  assetClass: AssetClass
  baseCurrency: string
}

const PAGE_SIZE = 10
const ALL_FILTER_VALUE = 'all'
const ASSET_SEARCH_MAX_LENGTH = 60
const ASSET_SEARCH_DEBOUNCE_MS = 300

const DEFAULT_FORM: AssetFormState = {
  symbol: '',
  name: '',
  type: 'equity',
  assetClass: 'equity',
  baseCurrency: 'USD',
}

function getSuggestedAssetClassForType(type: AssetType): AssetClass {
  switch (type) {
    case 'equity':
      return 'equity'
    case 'crypto':
      return 'crypto'
    case 'cash':
      return 'cash'
    case 'etf':
    default:
      return 'equity'
  }
}

function toAssetFormState(asset: Asset): AssetFormState {
  return {
    symbol: asset.symbol,
    name: asset.name,
    type: asset.type,
    assetClass: asset.assetClass ?? getSuggestedAssetClassForType(asset.type),
    baseCurrency: asset.baseCurrency,
  }
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

function formatTypeLabel(
  type: string | null | undefined,
  t: (key: string) => string,
) {
  if (!type) {
    return t('assets.unknownType')
  }

  switch (type) {
    case 'equity':
      return t('assets.typeEquity')
    case 'etf':
      return t('assets.typeEtf')
    case 'crypto':
      return t('assets.typeCrypto')
    case 'cash':
      return t('assets.typeCash')
    default:
      return type.toUpperCase()
  }
}

function formatAssetClassLabel(
  assetClass: string | null | undefined,
  t: (key: string) => string,
) {
  if (!assetClass) {
    return t('assets.unknownAssetClass')
  }

  switch (assetClass) {
    case 'equity':
      return t('assets.assetClassEquity')
    case 'bond':
      return t('assets.assetClassBond')
    case 'cash':
      return t('assets.assetClassCash')
    case 'crypto':
      return t('assets.assetClassCrypto')
    case 'precious_metal':
      return t('assets.assetClassPreciousMetal')
    default:
      return assetClass.toUpperCase()
  }
}

export default function Assets() {
  const { t } = useI18n()
  const [assets, setAssets] = useState<Asset[]>([])
  const [totalAssetsCount, setTotalAssetsCount] = useState(0)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [form, setForm] = useState<AssetFormState>(DEFAULT_FORM)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>(ALL_FILTER_VALUE)
  const [currencyFilter, setCurrencyFilter] = useState<string>(ALL_FILTER_VALUE)
  const [currentPage, setCurrentPage] = useState(1)
  const [isEditing, setIsEditing] = useState(false)
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const loadRequestIdRef = useRef(0)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

  const normalizedSearchQuery = useMemo(
    () =>
      sanitizeStrictTextInput(searchQuery, {
        maxLength: ASSET_SEARCH_MAX_LENGTH,
      }),
    [searchQuery],
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(normalizedSearchQuery)
    }, ASSET_SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [normalizedSearchQuery])

  const hasActiveCatalogFilters =
    Boolean(debouncedSearchQuery) ||
    typeFilter !== ALL_FILTER_VALUE ||
    currencyFilter !== ALL_FILTER_VALUE

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalAssetsCount / PAGE_SIZE)),
    [totalAssetsCount],
  )

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? null,
    [assets, selectedAssetId],
  )

  async function loadAssets(preferredSelectedAssetId?: string) {
    const requestId = ++loadRequestIdRef.current

    try {
      setLoadingAssets(true)
      setErrorMessage(null)
      const query: GetAssetsParams = {
        page: currentPage,
        take: PAGE_SIZE,
      }

      if (debouncedSearchQuery) {
        query.q = debouncedSearchQuery
      }

      if (typeFilter !== ALL_FILTER_VALUE) {
        query.type = typeFilter as AssetType
      }

      if (currencyFilter !== ALL_FILTER_VALUE) {
        query.baseCurrency = currencyFilter
      }

      const response = await assetsService.getAssets(query)

      if (requestId !== loadRequestIdRef.current) {
        return
      }

      setAssets(response.items)
      setTotalAssetsCount(response.total)
      setSelectedAssetId((current) =>
        preferredSelectedAssetId &&
        response.items.some((asset) => asset.id === preferredSelectedAssetId)
          ? preferredSelectedAssetId
          : current && response.items.some((asset) => asset.id === current)
            ? current
          : response.items[0]?.id ?? null,
      )
    } catch (err: unknown) {
      if (requestId === loadRequestIdRef.current) {
        setErrorMessage(getErrorMessage(err, t('assets.failedToLoad')))
      }
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoadingAssets(false)
      }
    }
  }

  useEffect(() => {
    loadAssets().catch(console.error)
  }, [currentPage, currencyFilter, debouncedSearchQuery, typeFilter])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    if (isEditing) {
      return
    }

    setSelectedAssetId((current) =>
      current && assets.some((asset) => asset.id === current)
        ? current
        : assets[0]?.id ?? null,
    )
  }, [assets, isEditing])

  useEffect(() => {
    if (!isEditing || !selectedAsset) {
      return
    }

    setForm(toAssetFormState(selectedAsset))
  }, [isEditing, selectedAsset])

  const resetToCreateMode = () => {
    setIsEditing(false)
    setForm(DEFAULT_FORM)
  }

  const startEditingSelectedAsset = () => {
    if (!selectedAsset) {
      return
    }

    setIsEditing(true)
    setForm(toAssetFormState(selectedAsset))
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  const handleSelectAsset = (assetId: string) => {
    if (isEditing) {
      return
    }

    setSelectedAssetId(assetId)
  }

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(
      sanitizeStrictTextInput(value, {
        maxLength: ASSET_SEARCH_MAX_LENGTH,
      }),
    )
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }

  const flushDebouncedSearchQuery = () => {
    if (debouncedSearchQuery !== normalizedSearchQuery) {
      setDebouncedSearchQuery(normalizedSearchQuery)
    }
  }

  const handleTypeFilterChange = (value: string) => {
    flushDebouncedSearchQuery()
    setTypeFilter(value)
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }

  const handleCurrencyFilterChange = (value: string) => {
    flushDebouncedSearchQuery()
    setCurrencyFilter(value)
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }

  const handlePageChange = (nextPage: number) => {
    flushDebouncedSearchQuery()
    setCurrentPage(nextPage)
  }

  const isCatalogLocked = isEditing

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const symbol = normalizeAssetSymbolInput(form.symbol)
    const name = normalizeAssetNameInput(form.name)
    const baseCurrency = normalizeSupportedCurrencyInput(form.baseCurrency)

    setForm((current) => ({
      ...current,
      symbol,
      name,
      baseCurrency,
    }))

    if (!symbol) {
      setErrorMessage(t('assets.symbolRequired'))
      return
    }

    if (!isSafeAssetSymbol(symbol)) {
      setErrorMessage(t('assets.invalidSymbol'))
      return
    }

    if (!name) {
      setErrorMessage(t('assets.nameRequired'))
      return
    }

    if (!isSafeAssetName(name)) {
      setErrorMessage(t('assets.invalidName'))
      return
    }

    if (!baseCurrency) {
      setErrorMessage(t('assets.baseCurrencyRequired'))
      return
    }

    if (!BASE_CURRENCY_OPTIONS.some((currency) => currency === baseCurrency)) {
      setErrorMessage(t('assets.invalidBaseCurrency'))
      return
    }

    try {
      setSubmitting(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      const payload = {
        symbol,
        name,
        type: form.type,
        assetClass: form.assetClass,
        baseCurrency,
      }

      if (isEditing && selectedAsset) {
        const updatedAsset = await assetsService.updateAsset(selectedAsset.id, payload)
        setSuccessMessage(t('assets.assetUpdated', { symbol: updatedAsset.symbol }))
        await loadAssets(updatedAsset.id)
        resetToCreateMode()
      } else {
        const createdAsset = await assetsService.createAsset(payload)
        setSuccessMessage(t('assets.assetCreated', { symbol: createdAsset.symbol }))
        setForm({
          ...DEFAULT_FORM,
          baseCurrency,
        })
        await loadAssets(createdAsset.id)
      }
    } catch (err: unknown) {
      setErrorMessage(
        getErrorMessage(
          err,
          isEditing ? t('assets.failedToUpdate') : t('assets.failedToCreate'),
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('assets.title')}</h1>
        <p className="max-w-3xl text-sm text-gray-600">
          {t('assets.subtitle')}
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

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 space-y-1">
            <h2 className="text-lg font-semibold">
              {isEditing ? t('assets.editTitle') : t('assets.createTitle')}
            </h2>
            <p className="text-sm text-gray-600">
              {isEditing ? t('assets.editDescription') : t('assets.createDescription')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="asset-symbol" className="block text-sm font-medium text-gray-700">
                {t('assets.symbol')}
              </label>
              <input
                id="asset-symbol"
                type="text"
                value={form.symbol}
                maxLength={ASSET_SYMBOL_MAX_LENGTH}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    symbol: sanitizeLightweightTextInput(event.target.value, {
                      maxLength: ASSET_SYMBOL_MAX_LENGTH,
                    }).toUpperCase(),
                  }))
                }
                placeholder={t('assets.symbolPlaceholder')}
                disabled={isEditing}
                className={`w-full rounded border px-3 py-2 ${
                  isEditing
                    ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500'
                    : 'border-gray-300'
                }`}
              />
              {isEditing && (
                <p className="text-xs text-gray-500">{t('assets.symbolLocked')}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="asset-base-currency" className="block text-sm font-medium text-gray-700">
                {t('assets.baseCurrency')}
              </label>
              <select
                id="asset-base-currency"
                value={form.baseCurrency}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    baseCurrency: event.target.value,
                  }))
                }
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                {BASE_CURRENCY_OPTIONS.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label htmlFor="asset-name" className="block text-sm font-medium text-gray-700">
                {t('assets.name')}
              </label>
              <input
                id="asset-name"
                type="text"
                value={form.name}
                maxLength={ASSET_NAME_MAX_LENGTH}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: sanitizeLightweightTextInput(event.target.value, {
                      maxLength: ASSET_NAME_MAX_LENGTH,
                    }),
                  }))
                }
                placeholder={t('assets.namePlaceholder')}
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label htmlFor="asset-type" className="block text-sm font-medium text-gray-700">
                {t('assets.type')}
              </label>
              <select
                id="asset-type"
                value={form.type}
                onChange={(event) =>
                  setForm((current) => {
                    const nextType = event.target.value as AssetType
                    const previousSuggestedClass = getSuggestedAssetClassForType(current.type)
                    const nextSuggestedClass = getSuggestedAssetClassForType(nextType)

                    return {
                      ...current,
                      type: nextType,
                      assetClass:
                        current.assetClass === previousSuggestedClass
                          ? nextSuggestedClass
                          : current.assetClass,
                    }
                  })
                }
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                {ASSET_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {formatTypeLabel(type, t)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label htmlFor="asset-asset-class" className="block text-sm font-medium text-gray-700">
                {t('assets.assetClass')}
              </label>
              <select
                id="asset-asset-class"
                value={form.assetClass}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    assetClass: event.target.value as AssetClass,
                  }))
                }
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                {ASSET_CLASS_OPTIONS.map((assetClass) => (
                  <option key={assetClass} value={assetClass}>
                    {formatAssetClassLabel(assetClass, t)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">{t('assets.assetClassHint')}</p>
            </div>

            <div className="md:col-span-2 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-600">
                {t('assets.investmentHintPrefix')}{' '}
                <Link to="/investments" className="font-medium text-blue-700 hover:text-blue-800">
                  {t('routes.investments')}
                </Link>
                .
              </p>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetToCreateMode}
                    className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    {t('common.cancel')}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className={`rounded px-4 py-2 text-sm font-medium text-white ${
                    submitting ? 'cursor-not-allowed bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {submitting
                    ? t('common.saving')
                    : isEditing
                      ? t('common.saveChanges')
                      : t('assets.createAction')}
                </button>
              </div>
            </div>
          </form>
        </div>

        <aside className="rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">{t('assets.selectedTitle')}</h2>
          {selectedAsset ? (
            <div className="space-y-3 text-sm text-gray-700">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  {formatTypeLabel(selectedAsset.type, t)}
                </div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">
                  {selectedAsset.symbol}
                </div>
                <div className="text-gray-600">{selectedAsset.name}</div>
                <div className="mt-3 text-sm text-gray-500">
                  {t('assets.baseCurrency')}: {selectedAsset.baseCurrency}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {t('assets.assetClass')}: {formatAssetClassLabel(selectedAsset.assetClass, t)}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p>{t('assets.selectedDescription')}</p>
                <button
                  type="button"
                  onClick={startEditingSelectedAsset}
                  className="shrink-0 rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  {t('assets.editAction')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-gray-700">
              <p>{t('assets.noSelectedAsset')}</p>
              <p>
                {t('assets.selectedCallToActionBefore')}{' '}
                <Link to="/investments" className="font-medium text-blue-700 hover:text-blue-800">
                  {t('routes.investments')}
                </Link>
                {' '}
                {t('assets.selectedCallToActionAfter')}
              </p>
            </div>
          )}
        </aside>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t('assets.catalogTitle')}</h2>
            <p className="text-sm text-gray-600">
              {t('assets.catalogDescription')}
            </p>
          </div>
          <div className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
            {hasActiveCatalogFilters
              ? t('assets.matchingCount', { count: totalAssetsCount })
              : t('assets.assetCount', { count: totalAssetsCount })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="w-full max-w-xs shrink-0 space-y-1">
                <label htmlFor="asset-search" className="block text-sm font-medium text-gray-700">
                  {t('assets.searchLabel')}
                </label>
                <input
                  id="asset-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) =>
                    handleSearchQueryChange(event.target.value)
                  }
                  placeholder={t('assets.searchPlaceholder')}
                  disabled={isCatalogLocked}
                  className={`w-full rounded border px-3 py-2 ${
                    isCatalogLocked
                      ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500'
                      : 'border-gray-300'
                  }`}
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-end lg:justify-end lg:gap-6">
                <div className="min-w-0 space-y-1">
                  <p className="block text-sm font-medium text-gray-700">
                    {t('assets.typeFilterLabel')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[ALL_FILTER_VALUE, ...ASSET_TYPE_OPTIONS].map((type) => {
                      const value = String(type)
                      const isActive = typeFilter === value
                      const label =
                        value === ALL_FILTER_VALUE
                          ? t('assets.allTypes')
                          : formatTypeLabel(value, t)

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleTypeFilterChange(value)}
                          disabled={isCatalogLocked}
                          aria-pressed={isActive}
                          className={`rounded-full border px-3 py-1.5 text-sm transition ${
                            isCatalogLocked
                              ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                              : isActive
                                ? 'border-blue-200 bg-blue-50 text-blue-700'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-1 lg:shrink-0">
                  <p className="block text-sm font-medium text-gray-700">
                    {t('assets.currencyFilterLabel')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[ALL_FILTER_VALUE, ...BASE_CURRENCY_OPTIONS].map((currency) => {
                      const value = String(currency)
                      const isActive = currencyFilter === value
                      const label =
                        value === ALL_FILTER_VALUE
                          ? t('assets.allCurrencies')
                          : value

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleCurrencyFilterChange(value)}
                          disabled={isCatalogLocked}
                          aria-pressed={isActive}
                          className={`rounded-full border px-3 py-1.5 text-sm transition ${
                            isCatalogLocked
                              ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                              : isActive
                                ? 'border-blue-200 bg-blue-50 text-blue-700'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isCatalogLocked && (
            <p className="text-sm text-gray-500">{t('assets.catalogLockedWhileEditing')}</p>
          )}

          {loadingAssets ? (
            <p className="text-sm text-gray-600">{t('assets.loadingAssets')}</p>
          ) : totalAssetsCount === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600">
              {hasActiveCatalogFilters ? t('assets.noFilteredAssets') : t('assets.noAssets')}
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="px-3 py-3 font-medium text-gray-600">{t('assets.symbol')}</th>
                    <th className="px-3 py-3 font-medium text-gray-600">{t('assets.name')}</th>
                    <th className="px-3 py-3 font-medium text-gray-600">{t('assets.type')}</th>
                    <th className="px-3 py-3 font-medium text-gray-600">{t('assets.assetClass')}</th>
                    <th className="px-3 py-3 font-medium text-gray-600">{t('assets.baseCurrency')}</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => {
                    const isSelected = asset.id === selectedAssetId

                    return (
                      <tr
                        key={asset.id}
                        onClick={() => handleSelectAsset(asset.id)}
                        className={`border-b border-gray-100 ${
                          isCatalogLocked
                            ? isSelected
                              ? 'cursor-not-allowed bg-blue-50'
                              : 'cursor-not-allowed bg-white'
                            : isSelected
                              ? 'cursor-pointer bg-blue-50'
                              : 'cursor-pointer hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-3 py-3 font-medium text-gray-900">
                          {asset.symbol}
                        </td>
                        <td className="px-3 py-3 text-gray-700">{asset.name}</td>
                        <td className="px-3 py-3 capitalize text-gray-600">
                          {formatTypeLabel(asset.type, t)}
                        </td>
                        <td className="px-3 py-3 text-gray-600">
                          {formatAssetClassLabel(asset.assetClass, t)}
                        </td>
                        <td className="px-3 py-3 text-gray-600">
                          {asset.baseCurrency}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{t('assets.pageStatus', { current: currentPage, total: totalPages })}</span>
                <span className="text-gray-400">·</span>
                <span>{t('assets.pageSizeFixed', { count: PAGE_SIZE })}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={isCatalogLocked || currentPage === 1}
                  className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {t('assets.previousPage')}
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={isCatalogLocked || currentPage === totalPages}
                  className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {t('assets.nextPage')}
                </button>
              </div>
            </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
