import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  assetsService,
  ASSET_TYPE_OPTIONS,
  BASE_CURRENCY_SUGGESTIONS,
  type Asset,
  type AssetType,
} from '../lib/assets.service'

type AssetFormState = {
  symbol: string
  name: string
  type: AssetType
  baseCurrency: string
}

const DEFAULT_FORM: AssetFormState = {
  symbol: '',
  name: '',
  type: 'equity',
  baseCurrency: 'USD',
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

function formatTypeLabel(type?: string | null) {
  if (!type) {
    return 'UNKNOWN'
  }

  return type.toUpperCase()
}

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [form, setForm] = useState<AssetFormState>(DEFAULT_FORM)
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? null,
    [assets, selectedAssetId],
  )

  async function loadAssets() {
    try {
      setLoadingAssets(true)
      setErrorMessage(null)
      const loadedAssets = await assetsService.getAssets()
      setAssets(loadedAssets)
      setSelectedAssetId((current) =>
        current && loadedAssets.some((asset) => asset.id === current)
          ? current
          : loadedAssets[0]?.id ?? null,
      )
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, 'Failed to load assets'))
    } finally {
      setLoadingAssets(false)
    }
  }

  useEffect(() => {
    loadAssets().catch(console.error)
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const symbol = form.symbol.trim().toUpperCase()
    const name = form.name.trim()
    const baseCurrency = form.baseCurrency.trim().toUpperCase()

    if (!symbol) {
      setErrorMessage('Symbol is required')
      return
    }

    if (!name) {
      setErrorMessage('Name is required')
      return
    }

    if (!baseCurrency) {
      setErrorMessage('Base currency is required')
      return
    }

    try {
      setSubmitting(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      const createdAsset = await assetsService.createAsset({
        symbol,
        name,
        type: form.type,
        baseCurrency,
      })

      setSuccessMessage(`Asset ${createdAsset.symbol} created.`)
      setForm({
        ...DEFAULT_FORM,
        baseCurrency,
      })
      await loadAssets()
      setSelectedAssetId(createdAsset.id)
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, 'Failed to create asset'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Assets</h1>
        <p className="max-w-3xl text-sm text-gray-600">
          Create the minimum tradable asset catalog the investment flow needs.
          If a stock, ETF, or crypto is missing here, buy, sell, and dividend
          entry will stall in Investments.
        </p>
      </header>

      {errorMessage && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          <strong>Error:</strong> {errorMessage}
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
            <h2 className="text-lg font-semibold">Create asset</h2>
            <p className="text-sm text-gray-600">
              First version stays manual on purpose. External lookup and import
              can come later.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Symbol
              </label>
              <input
                type="text"
                value={form.symbol}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    symbol: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="e.g. AAPL or 0050"
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Base currency
              </label>
              <select
                value={form.baseCurrency}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    baseCurrency: event.target.value,
                  }))
                }
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                {BASE_CURRENCY_SUGGESTIONS.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="e.g. Apple Inc."
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as AssetType,
                  }))
                }
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                {ASSET_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-600">
                Assets created here become selectable in{' '}
                <Link to="/transactions" className="font-medium text-blue-700 hover:text-blue-800">
                  Investments
                </Link>
                .
              </p>
              <button
                type="submit"
                disabled={submitting}
                className={`rounded px-4 py-2 text-sm font-medium text-white ${
                  submitting ? 'cursor-not-allowed bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {submitting ? 'Creating...' : 'Create asset'}
              </button>
            </div>
          </form>
        </div>

        <aside className="rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Selected asset</h2>
          {selectedAsset ? (
            <div className="space-y-3 text-sm text-gray-700">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  {formatTypeLabel(selectedAsset.type)}
                </div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">
                  {selectedAsset.symbol}
                </div>
                <div className="text-gray-600">{selectedAsset.name}</div>
                <div className="mt-3 text-sm text-gray-500">
                  Base currency: {selectedAsset.baseCurrency}
                </div>
              </div>
              <p>
                Row selection is already in place so this page can grow into
                edit mode next, without changing the basic browsing flow.
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-gray-700">
              <p>No asset selected yet.</p>
              <p>
                Create one manually, then return to{' '}
                <Link to="/transactions" className="font-medium text-blue-700 hover:text-blue-800">
                  Investments
                </Link>{' '}
                to use it in buy, sell, or dividend entry.
              </p>
            </div>
          )}
        </aside>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Asset catalog</h2>
            <p className="text-sm text-gray-600">
              Click any row to review what already exists.
            </p>
          </div>
          <div className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
            {assets.length} asset{assets.length === 1 ? '' : 's'}
          </div>
        </div>

        {loadingAssets ? (
          <p className="text-sm text-gray-600">Loading assets...</p>
        ) : assets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600">
            No assets yet. Create your first tradable asset above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-3 py-3 font-medium text-gray-600">Symbol</th>
                  <th className="px-3 py-3 font-medium text-gray-600">Name</th>
                  <th className="px-3 py-3 font-medium text-gray-600">Type</th>
                  <th className="px-3 py-3 font-medium text-gray-600">Base currency</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => {
                  const isSelected = asset.id === selectedAssetId

                  return (
                    <tr
                      key={asset.id}
                      onClick={() => setSelectedAssetId(asset.id)}
                      className={`cursor-pointer border-b border-gray-100 ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-3 font-medium text-gray-900">
                        {asset.symbol}
                      </td>
                      <td className="px-3 py-3 text-gray-700">{asset.name}</td>
                      <td className="px-3 py-3 capitalize text-gray-600">
                        {asset.type}
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
        )}
      </section>
    </div>
  )
}
