import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../i18n'
import Assets from './Assets'

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
  const initialAssets = [
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

  beforeEach(() => {
    getAssets.mockResolvedValue(initialAssets)
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
      .mockResolvedValueOnce(initialAssets)
      .mockResolvedValueOnce([
        {
          id: 'asset-aapl',
          symbol: 'AAPL',
          name: 'Apple Incorporated',
          type: 'etf',
          baseCurrency: 'TWD',
        },
        initialAssets[1],
      ])

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
    getAssets.mockResolvedValueOnce([
      ...initialAssets,
      {
        id: 'asset-btc',
        symbol: 'BTC',
        name: 'Bitcoin',
        type: 'crypto',
        baseCurrency: 'USD',
      },
    ])

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
      expect(screen.getByText('1 of 3 assets')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Equity' }))

    await waitFor(() => {
      expect(screen.getByText('No assets match the current search or filters.')).toBeTruthy()
    })
  })

  it('paginates the catalog locally and disables catalog controls while editing', async () => {
    const manyAssets = Array.from({ length: 16 }, (_, index) => ({
      id: `asset-${index + 1}`,
      symbol: `SYM${index + 1}`,
      name: `Asset ${index + 1}`,
      type: index % 2 === 0 ? 'equity' : 'etf',
      baseCurrency: index % 3 === 0 ? 'USD' : 'TWD',
    }))

    getAssets.mockResolvedValueOnce(manyAssets)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Page 1 / 2')).toBeTruthy()
      expect(screen.getAllByText('Asset 10').length).toBeGreaterThan(0)
      expect(screen.queryByText('Asset 11')).toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
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
})
