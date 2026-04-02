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
  BASE_CURRENCY_OPTIONS: ['USD', 'TWD', 'JPY', 'EUR'],
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
})
