import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useI18n } from '../i18n'
import {
  assetsService,
  SUPPORTED_BROKER_FOR_ALIAS,
  type Asset,
} from '../lib/assets.service'
import { getApiErrorMessage, parseAssetAliasConflict } from '../lib/errors'
import { Button } from './ui/Button'

const SEARCH_DEBOUNCE_MS = 300
const SEARCH_PAGE_SIZE = 10

type ImportAliasRepairDialogProps = {
  open: boolean
  rawAlias: string
  onClose: () => void
  onSuccess: () => void
}

export function ImportAliasRepairDialog({
  open,
  rawAlias,
  onClose,
  onSuccess,
}: ImportAliasRepairDialogProps) {
  const { t } = useI18n()
  const [searchInput, setSearchInput] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    setSearchInput('')
    setDebouncedQuery('')
    setSelectedAsset(null)
    setDialogError(null)
  }, [open, rawAlias])

  useEffect(() => {
    if (!open) {
      return
    }

    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchInput.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [open, searchInput])

  const searchQuery = useQuery({
    queryKey: ['assets', 'alias-repair-search', debouncedQuery],
    queryFn: () =>
      assetsService.getAssets({
        q: debouncedQuery,
        page: 1,
        take: SEARCH_PAGE_SIZE,
      }),
    enabled: open && debouncedQuery.length > 0,
  })

  const createAliasMutation = useMutation({
    mutationFn: (asset: Asset) =>
      assetsService.createAssetAlias(asset.id, {
        alias: rawAlias,
        broker: SUPPORTED_BROKER_FOR_ALIAS,
      }),
    onSuccess: () => {
      setDialogError(null)
      onSuccess()
    },
    onError: (err: unknown) => {
      const conflict = parseAssetAliasConflict(err)
      if (conflict) {
        setDialogError(
          t('transactions.aliasRepairConflict', {
            symbol: conflict.existingAsset.symbol,
            name: conflict.existingAsset.name,
          }),
        )
        return
      }

      setDialogError(
        getApiErrorMessage(err, t('transactions.aliasRepairFailed')),
      )
    },
  })

  if (!open) {
    return null
  }

  const searchResults = searchQuery.data?.items ?? []
  const confirmDisabled = !selectedAsset || createAliasMutation.isPending

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="alias-repair-title"
        className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="alias-repair-title" className="text-lg font-semibold">
          {t('transactions.aliasRepairTitle')}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {t('transactions.aliasRepairDescription')}
        </p>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-gray-500">
              {t('transactions.aliasRepairRawName')}
            </dt>
            <dd className="font-medium text-gray-900">{rawAlias}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-gray-500">
              {t('transactions.aliasRepairBroker')}
            </dt>
            <dd className="font-medium text-gray-900">
              {t('transactions.aliasRepairBrokerCathay')}
            </dd>
          </div>
        </dl>

        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-gray-700">
            {t('transactions.aliasRepairSearchLabel')}
          </span>
          <input
            type="search"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value)
              setSelectedAsset(null)
              setDialogError(null)
            }}
            placeholder={t('transactions.aliasRepairSearchPlaceholder')}
            className="w-full rounded border border-gray-300 px-3 py-2"
            autoFocus
          />
        </label>

        <div className="mt-2 max-h-48 overflow-y-auto rounded border border-gray-200">
          {!debouncedQuery && (
            <p className="px-3 py-2 text-sm text-gray-500">
              {t('transactions.aliasRepairSearchHint')}
            </p>
          )}
          {debouncedQuery && searchQuery.isLoading && (
            <p className="px-3 py-2 text-sm text-gray-500">
              {t('transactions.aliasRepairSearching')}
            </p>
          )}
          {debouncedQuery &&
            !searchQuery.isLoading &&
            searchResults.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-500">
                {t('transactions.aliasRepairNoResults')}
              </p>
            )}
          {searchResults.map((asset) => {
            const selected = selectedAsset?.id === asset.id
            return (
              <button
                key={asset.id}
                type="button"
                className={`flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                  selected ? 'bg-slate-100' : ''
                }`}
                onClick={() => {
                  setSelectedAsset(asset)
                  setDialogError(null)
                }}
              >
                <span className="font-medium text-gray-900">{asset.symbol}</span>
                <span className="text-gray-600">{asset.name}</span>
              </button>
            )
          })}
        </div>

        {selectedAsset && (
          <p className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-gray-800">
            {t('transactions.aliasRepairConfirmMapping', {
              rawAlias,
              symbol: selectedAsset.symbol,
              name: selectedAsset.name,
            })}
          </p>
        )}

        {dialogError && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {dialogError}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}
            disabled={createAliasMutation.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="dark"
            type="button"
            disabled={confirmDisabled}
            onClick={() => {
              if (!selectedAsset) {
                return
              }
              setDialogError(null)
              createAliasMutation.mutate(selectedAsset)
            }}
          >
            {createAliasMutation.isPending
              ? t('transactions.aliasRepairCreating')
              : t('transactions.aliasRepairConfirm')}
          </Button>
        </div>
      </div>
    </div>
  )
}
