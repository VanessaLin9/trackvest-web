import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../i18n'
import Assets from './Assets'
import type { Asset, AssetListResponse } from '../lib/assets.service'

const { getAssets, createAsset, updateAsset } = vi.hoisted(() => ({
  getAssets: vi.fn(),
  createAsset: vi.fn(),
  updateAsset: vi.fn(),
}))

vi.mock('../lib/assets.service', () => ({
  ASSET_TYPE_OPTIONS: ['equity', 'etf', 'crypto', 'cash'],
  BASE_CURRENCY_OPTIONS: ['USD', 'TWD'],
  assetsService: {
    getAssets,
    createAsset,
    updateAsset,
  },
}))

describe('Assets page edit mode', () => {
  const initialAssets: Asset[] = [
    {
      id: 'asset-aapl',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      type: 'equity',
      baseCurrency: 'USD',
    },
    {
      id: 'asset-0050',
      symbol: '0050',
      name: 'Taiwan Top 50',
      type: 'etf',
      baseCurrency: 'TWD',
    },
  ]

  function makeAssetsResponse(
    items: Asset[],
    {
      total = items.length,
      page = 1,
      take = 10,
    }: Partial<AssetListResponse> = {},
  ): AssetListResponse {
    return {
      items,
      total,
      page,
      take,
    }
  }

  beforeEach(() => {
    getAssets.mockResolvedValue(makeAssetsResponse(initialAssets))
    createAsset.mockResolvedValue(initialAssets[0])
    updateAsset.mockResolvedValue({
      ...initialAssets[0],
      name: 'Apple Incorporated',
      type: 'etf',
      baseCurrency: 'TWD',
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  function renderPage() {
    return render(
      <I18nProvider>
        <MemoryRouter>
          <Assets />
        </MemoryRouter>
      </I18nProvider>,
    )
  }

  it('updates the selected asset and keeps it selected after refresh', async () => {
    getAssets
      .mockResolvedValueOnce(makeAssetsResponse(initialAssets))
      .mockResolvedValueOnce(
        makeAssetsResponse([
          {
            id: 'asset-aapl',
            symbol: 'AAPL',
            name: 'Apple Incorporated',
            type: 'etf',
            baseCurrency: 'TWD',
          },
          initialAssets[1],
        ]),
      )

    renderPage()

    await waitFor(() => {
      expect(getAssets).toHaveBeenCalledTimes(1)
      expect(screen.getAllByText('Apple Inc.').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    const symbolInput = screen.getByLabelText('Symbol') as HTMLInputElement
    expect(symbolInput.disabled).toBe(true)
    expect(symbolInput.value).toBe('AAPL')

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Apple Incorporated' },
    })
    fireEvent.change(screen.getByLabelText('Base currency'), {
      target: { value: 'TWD' },
    })
    fireEvent.change(screen.getByLabelText('Type'), {
      target: { value: 'etf' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateAsset).toHaveBeenCalledWith('asset-aapl', {
        symbol: 'AAPL',
        name: 'Apple Incorporated',
        type: 'etf',
        baseCurrency: 'TWD',
      })
    })

    await waitFor(() => {
      expect(getAssets).toHaveBeenCalledTimes(2)
      expect(screen.getByText('Asset AAPL updated.')).toBeTruthy()
      expect(screen.getAllByText('Apple Incorporated').length).toBeGreaterThan(0)
    })

    expect(screen.getByRole('button', { name: 'Create asset' })).toBeTruthy()
  })

  it('cancels edit mode without sending an update', async () => {
    renderPage()

    await waitFor(() => {
      expect(getAssets).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Changed locally' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(updateAsset).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Create asset' })).toBeTruthy()
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('')
  })

  it('keeps the current selection locked while editing', async () => {
    renderPage()

    await waitFor(() => {
      expect(getAssets).toHaveBeenCalledTimes(1)
      expect(screen.getAllByText('Apple Inc.').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    fireEvent.click(screen.getByText('Taiwan Top 50'))

    expect((screen.getByLabelText('Symbol') as HTMLInputElement).value).toBe('AAPL')
    expect(screen.getAllByText('Apple Inc.').length).toBeGreaterThan(0)
  })

  it('filters assets by search text and selected filters', async () => {
    const allAssets: Asset[] = [
      ...initialAssets,
      {
        id: 'asset-btc',
        symbol: 'BTC',
        name: 'Bitcoin',
        type: 'crypto',
        baseCurrency: 'USD',
      },
    ]

    getAssets
      .mockResolvedValueOnce(makeAssetsResponse(allAssets, { total: 3 }))
      .mockResolvedValueOnce(
        makeAssetsResponse([allAssets[2]], {
          total: 1,
        }),
      )
      .mockResolvedValueOnce(
        makeAssetsResponse([], {
          total: 0,
        }),
      )

    renderPage()

    await waitFor(() => {
      expect(getAssets).toHaveBeenCalledTimes(1)
      expect(screen.getByLabelText('Search assets')).toBeTruthy()
    })

    fireEvent.change(screen.getByLabelText('Search assets'), {
      target: { value: 'bit' },
    })

    await waitFor(() => {
      expect(screen.getAllByText('Bitcoin').length).toBeGreaterThan(0)
      expect(screen.queryByText('Apple Inc.')).toBeNull()
      expect(getAssets).toHaveBeenLastCalledWith({
        page: 1,
        q: 'bit',
        take: 10,
      })
      expect(screen.getByText('1 matching asset')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Equity' }))

    await waitFor(() => {
      expect(getAssets).toHaveBeenLastCalledWith({
        page: 1,
        q: 'bit',
        take: 10,
        type: 'equity',
      })
      expect(screen.getByText('No assets match the current search or filters.')).toBeTruthy()
    })
  })

  it('sanitizes lightweight search input before filtering', async () => {
    getAssets
      .mockResolvedValueOnce(makeAssetsResponse(initialAssets))
      .mockResolvedValue(makeAssetsResponse([]))

    renderPage()

    await waitFor(() => {
      expect(screen.getByLabelText('Search assets')).toBeTruthy()
    })

    const searchInput = screen.getByLabelText('Search assets') as HTMLInputElement

    fireEvent.change(searchInput, {
      target: {
        value: `  bit\u0000${'x'.repeat(80)}`,
      },
    })

    expect(searchInput.value.startsWith(' bit')).toBe(true)
    expect(searchInput.value.includes('\u0000')).toBe(false)
    expect(searchInput.value.length).toBe(60)

    await waitFor(() => {
      expect(
        getAssets.mock.calls.some(
          ([params]) =>
            params.page === 1 &&
            params.take === 10 &&
            typeof params.q === 'string' &&
            params.q.startsWith('bit') &&
            params.q.length < 60,
        ),
      ).toBe(true)
    })
  })

  it('normalizes asset form values before creating an asset', async () => {
    renderPage()

    await waitFor(() => {
      expect(getAssets).toHaveBeenCalledTimes(1)
    })

    fireEvent.change(screen.getByLabelText('Symbol'), {
      target: { value: ' aapl ' },
    })
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: '  Apple   Inc.  ' },
    })
    fireEvent.change(screen.getByLabelText('Base currency'), {
      target: { value: 'TWD' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Create asset' }))

    await waitFor(() => {
      expect(createAsset).toHaveBeenCalledWith({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'equity',
        baseCurrency: 'TWD',
      })
    })
  })

  it('rejects unsafe symbol and name input before sending to the api', async () => {
    renderPage()

    await waitFor(() => {
      expect(getAssets).toHaveBeenCalledTimes(1)
    })

    fireEvent.change(screen.getByLabelText('Symbol'), {
      target: { value: '<script>' },
    })
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Safe Name' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Create asset' }))

    await waitFor(() => {
      expect(screen.getByText('Symbol can use only letters, numbers, and . _ : / -')).toBeTruthy()
    })

    expect(createAsset).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Symbol'), {
      target: { value: 'MSFT' },
    })
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Apple <script>' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Create asset' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'Name contains unsupported characters. Use letters, numbers, spaces, and common punctuation only.',
        ),
      ).toBeTruthy()
    })

    expect(createAsset).not.toHaveBeenCalled()
  })

  it('paginates the catalog locally and disables catalog controls while editing', async () => {
    const manyAssets: Asset[] = Array.from({ length: 16 }, (_, index) => ({
      id: `asset-${index + 1}`,
      symbol: `SYM${index + 1}`,
      name: `Asset ${index + 1}`,
      type: index % 2 === 0 ? 'equity' : 'etf',
      baseCurrency: index % 3 === 0 ? 'USD' : 'TWD',
    }))

    getAssets
      .mockResolvedValueOnce(
        makeAssetsResponse(manyAssets.slice(0, 10), {
          total: 16,
        }),
      )
      .mockResolvedValueOnce(
        makeAssetsResponse(manyAssets.slice(10), {
          total: 16,
          page: 2,
        }),
      )

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Page 1 / 2')).toBeTruthy()
      expect(screen.getAllByText('Asset 10').length).toBeGreaterThan(0)
      expect(screen.queryByText('Asset 11')).toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(getAssets).toHaveBeenLastCalledWith({
        page: 2,
        take: 10,
      })
      expect(screen.getByText('Page 2 / 2')).toBeTruthy()
      expect(screen.getAllByText('Asset 16').length).toBeGreaterThan(0)
      expect(screen.queryByText('Asset 10')).toBeNull()
    })

    const asset16Cell = screen
      .getAllByText('Asset 16')
      .find((element) => element.tagName === 'TD')
    expect(asset16Cell).toBeTruthy()
    fireEvent.click(asset16Cell!)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect((screen.getByLabelText('Search assets') as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'All types' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'All currencies' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('resets to the first page with a single request when filters change from a later page', async () => {
    const manyAssets: Asset[] = Array.from({ length: 16 }, (_, index) => ({
      id: `asset-${index + 1}`,
      symbol: `SYM${index + 1}`,
      name: `Asset ${index + 1}`,
      type: index % 2 === 0 ? 'equity' : 'etf',
      baseCurrency: index % 3 === 0 ? 'USD' : 'TWD',
    }))

    getAssets
      .mockResolvedValueOnce(
        makeAssetsResponse(manyAssets.slice(0, 10), {
          total: 16,
        }),
      )
      .mockResolvedValueOnce(
        makeAssetsResponse(manyAssets.slice(10), {
          total: 16,
          page: 2,
        }),
      )
      .mockResolvedValueOnce(
        makeAssetsResponse(manyAssets.filter((asset) => asset.type === 'equity').slice(0, 10), {
          total: 8,
        }),
      )

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Page 1 / 2')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(getAssets).toHaveBeenLastCalledWith({
        page: 2,
        take: 10,
      })
      expect(screen.getByText('Page 2 / 2')).toBeTruthy()
    })

    const callsBeforeFilter = getAssets.mock.calls.length

    fireEvent.click(screen.getByRole('button', { name: 'Equity' }))

    await waitFor(() => {
      expect(getAssets).toHaveBeenCalledTimes(callsBeforeFilter + 1)
      expect(getAssets).toHaveBeenLastCalledWith({
        page: 1,
        take: 10,
        type: 'equity',
      })
      expect(screen.getByText('Page 1 / 1')).toBeTruthy()
    })
  })
})
