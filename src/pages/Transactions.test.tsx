import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { setCurrentUserId } from '../app/current-user'
import { AuthProvider } from '../app/auth-context'
import { I18nProvider } from '../i18n'
import Transactions from './Transactions'

const {
  getAccounts,
  getAssets,
  getTransactions,
  createTransaction,
  updateTransaction,
  removeTransaction,
  previewImportTransactions,
  commitImportTransactions,
} = vi.hoisted(() => ({
  getAccounts: vi.fn(),
  getAssets: vi.fn(),
  getTransactions: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  removeTransaction: vi.fn(),
  previewImportTransactions: vi.fn(),
  commitImportTransactions: vi.fn(),
}))

vi.mock('../lib/investments.service', () => ({
  investmentsService: {
    getAccounts,
    getAssets,
    getTransactions,
    createTransaction,
    updateTransaction,
    removeTransaction,
    previewImportTransactions,
    commitImportTransactions,
  },
}))

describe('Transactions page trade flows', () => {
  beforeEach(() => {
    setCurrentUserId('user-1')

    getAccounts.mockResolvedValue([
      {
        id: 'broker-1',
        userId: 'user-1',
        name: 'Broker TWD',
        type: 'broker',
        currency: 'TWD',
        broker: 'cathay',
        createdAt: '2026-03-25T00:00:00.000Z',
      },
    ])
    getAssets.mockResolvedValue([
      {
        id: 'asset-2330',
        symbol: '2330',
        name: 'TSMC',
        type: 'equity',
        baseCurrency: 'TWD',
      },
    ])
    getTransactions.mockResolvedValue({
      total: 0,
      skip: 0,
      take: 20,
      items: [],
    })
    createTransaction.mockResolvedValue({ id: 'tx-1' })
    updateTransaction.mockResolvedValue({ id: 'tx-1' })
    removeTransaction.mockResolvedValue({ id: 'tx-1' })
    previewImportTransactions.mockResolvedValue({
      totalRows: 0,
      readyCount: 0,
      errorCount: 0,
      warningCount: 0,
      canCommit: true,
      rows: [],
    })
    commitImportTransactions.mockResolvedValue({
      totalRows: 0,
      successCount: 0,
      failureCount: 0,
      createdTransactionIds: [],
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    setCurrentUserId('')
  })

  function renderPage() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    return render(
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider
            initialUser={{ id: 'user-1', email: 'test@example.com', role: 'USER' }}
          >
            <MemoryRouter>
              <Transactions />
            </MemoryRouter>
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>,
    )
  }

  function buildApiError(message: string) {
    return {
      response: {
        data: {
          message,
        },
      },
    }
  }

  async function switchToMode(mode: 'buy' | 'sell') {
    renderPage()

    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalled()
      expect(getAssets).toHaveBeenCalled()
      expect(getTransactions).toHaveBeenCalled()
    })

    const label = mode === 'buy' ? 'Buy' : 'Sell'
    fireEvent.click(screen.getByRole('button', { name: label }))
  }

  async function renderPageWithTransactions() {
    getTransactions.mockResolvedValue({
      total: 1,
      skip: 0,
      take: 20,
      items: [
        {
          id: 'tx-sell-1',
          accountId: 'broker-1',
          assetId: 'asset-2330',
          type: 'sell',
          amount: 980,
          quantity: 10,
          price: 100,
          fee: 15,
          tax: 5,
          tradeTime: '2026-03-31T09:30:00.000Z',
          note: 'Trim position',
          brokerOrderNo: 'BRK-001',
          isDeleted: false,
          deletedAt: null,
          account: {
            id: 'broker-1',
            name: 'Broker TWD',
            currency: 'TWD',
            userId: 'user-1',
          },
          asset: {
            id: 'asset-2330',
            symbol: '2330',
            name: 'TSMC',
            baseCurrency: 'TWD',
          },
        },
      ],
    })

    renderPage()

    await waitFor(() => {
      expect(getTransactions).toHaveBeenCalled()
      expect(screen.getByText('Trim position')).toBeTruthy()
    })
  }

  it('submits a buy payload with tax included', async () => {
    await switchToMode('buy')

    fireEvent.change(screen.getByLabelText('Quantity'), {
      target: { value: '10' },
    })
    fireEvent.change(screen.getByLabelText('Price'), {
      target: { value: '100' },
    })
    fireEvent.change(screen.getByLabelText('Fee'), {
      target: { value: '15' },
    })
    fireEvent.change(screen.getByLabelText('Tax'), {
      target: { value: '5' },
    })
    fireEvent.change(screen.getByLabelText('Broker order no'), {
      target: { value: 'BRK-BUY-001' },
    })
    fireEvent.change(screen.getByLabelText('Note'), {
      target: { value: 'Build position' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save Buy' }))

    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'broker-1',
          assetId: 'asset-2330',
          type: 'buy',
          amount: 1020,
          quantity: 10,
          price: 100,
          fee: 15,
          tax: 5,
          brokerOrderNo: 'BRK-BUY-001',
          note: 'Build position',
        }),
      )
    })

    const payload = createTransaction.mock.calls[0][0]
    expect(payload.tradeTime).toEqual(expect.any(String))
    expect(screen.getByText('Buy saved')).toBeTruthy()
  })

  it('submits a sell payload with net proceeds and tax included', async () => {
    await switchToMode('sell')

    fireEvent.change(screen.getByLabelText('Quantity'), {
      target: { value: '10' },
    })
    fireEvent.change(screen.getByLabelText('Price'), {
      target: { value: '100' },
    })
    fireEvent.change(screen.getByLabelText('Fee'), {
      target: { value: '15' },
    })
    fireEvent.change(screen.getByLabelText('Tax'), {
      target: { value: '5' },
    })
    fireEvent.change(screen.getByLabelText('Broker order no'), {
      target: { value: 'BRK-SELL-001' },
    })
    fireEvent.change(screen.getByLabelText('Note'), {
      target: { value: 'Trim position' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save Sell' }))

    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'broker-1',
          assetId: 'asset-2330',
          type: 'sell',
          amount: 980,
          quantity: 10,
          price: 100,
          fee: 15,
          tax: 5,
          brokerOrderNo: 'BRK-SELL-001',
          note: 'Trim position',
        }),
      )
    })

    const payload = createTransaction.mock.calls[0][0]
    expect(payload.tradeTime).toEqual(expect.any(String))
    expect(screen.getByText('Sell saved')).toBeTruthy()
  })

  it('blocks buy submission when no tradable asset is available', async () => {
    getAssets.mockResolvedValueOnce([])

    renderPage()

    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalled()
      expect(getAssets).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Buy' }))

    fireEvent.change(screen.getByLabelText('Quantity'), {
      target: { value: '10' },
    })
    fireEvent.change(screen.getByLabelText('Price'), {
      target: { value: '100' },
    })

    const saveButton = screen.getByRole('button', { name: 'Save Buy' })
    expect((saveButton as HTMLButtonElement).disabled).toBe(true)

    const warning = screen.getByText(
      (_, element) =>
        element?.textContent === 'No asset available. Create one in Assets first.',
    )
    expect(warning).toBeTruthy()
    expect(createTransaction).not.toHaveBeenCalled()
  })

  it('blocks buy submission when quantity is missing', async () => {
    await switchToMode('buy')

    fireEvent.change(screen.getByLabelText('Price'), {
      target: { value: '100' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save Buy' }))

    expect(
      await screen.findByText(
        'Quantity must be a positive number for buy transactions',
      ),
    ).toBeTruthy()
    expect(createTransaction).not.toHaveBeenCalled()
  })

  it('loads a listed sell transaction into edit mode and updates it', async () => {
    await renderPageWithTransactions()

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit Sell transaction' }),
    )

    fireEvent.change(screen.getByLabelText('Quantity'), {
      target: { value: '8' },
    })
    fireEvent.change(screen.getByLabelText('Tax'), {
      target: { value: '8' },
    })
    fireEvent.change(screen.getByLabelText('Broker order no'), {
      target: { value: 'BRK-001-UPDATED' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateTransaction).toHaveBeenCalledWith(
        'tx-sell-1',
        expect.objectContaining({
          type: 'sell',
          quantity: 8,
          price: 100,
          fee: 15,
          tax: 8,
          brokerOrderNo: 'BRK-001-UPDATED',
          amount: 777,
        }),
      )
    })
  })

  it('soft deletes a listed transaction', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    await renderPageWithTransactions()

    fireEvent.click(
      screen.getByRole('button', { name: 'Delete Sell transaction' }),
    )

    await waitFor(() => {
      expect(removeTransaction).toHaveBeenCalledWith('tx-sell-1')
    })
  })

  it('shows the backend oversell error when a sell submission is rejected', async () => {
    createTransaction.mockRejectedValueOnce(
      buildApiError('sell quantity exceeds the remaining open position lots'),
    )

    await switchToMode('sell')

    fireEvent.change(screen.getByLabelText('Quantity'), {
      target: { value: '999' },
    })
    fireEvent.change(screen.getByLabelText('Price'), {
      target: { value: '100' },
    })
    fireEvent.change(screen.getByLabelText('Fee'), {
      target: { value: '15' },
    })
    fireEvent.change(screen.getByLabelText('Tax'), {
      target: { value: '5' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save Sell' }))

    expect(
      await screen.findByText('sell quantity exceeds the remaining open position lots'),
    ).toBeTruthy()
  })

  it('shows import preview row errors and blocks commit when rows are not ready', async () => {
    previewImportTransactions.mockResolvedValueOnce({
      totalRows: 1,
      readyCount: 0,
      errorCount: 1,
      warningCount: 0,
      canCommit: false,
      rows: [
        {
          row: 2,
          status: 'error',
          rawAssetName: '0050',
          brokerOrderNo: 'BRK-001',
          tradeDate: '2026-03-31',
          resolvedAsset: null,
          normalizedTransaction: null,
          errors: [
            {
              code: 'INVALID_ROW',
              field: '委託書號',
              message: 'sell quantity exceeds the remaining open position lots',
            },
          ],
          warnings: [],
        },
      ],
    })

    renderPage()

    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalled()
      expect(getAssets).toHaveBeenCalled()
    })

    const file = new File(
      ['股名,日期,成交股數\n0050,2026-03-31,999'],
      'sell-import.csv',
      { type: 'text/csv' },
    )

    fireEvent.change(screen.getByLabelText('File'), {
      target: { files: [file] },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Preview CSV' }))

    await waitFor(() => {
      expect(previewImportTransactions).toHaveBeenCalledWith({
        accountId: 'broker-1',
        csvContent: '股名,日期,成交股數\n0050,2026-03-31,999',
      })
    })

    expect(
      await screen.findByText('sell quantity exceeds the remaining open position lots'),
    ).toBeTruthy()
    expect(screen.getByText('Row 2 · 委託書號')).toBeTruthy()

    const commitButton = screen.getByRole('button', { name: 'Commit import' })
    expect(commitButton).toHaveProperty('disabled', true)
    expect(commitImportTransactions).not.toHaveBeenCalled()
  })

  it('commits import when preview is ready', async () => {
    previewImportTransactions.mockResolvedValueOnce({
      totalRows: 1,
      readyCount: 1,
      errorCount: 0,
      warningCount: 0,
      canCommit: true,
      rows: [
        {
          row: 2,
          status: 'ready',
          rawAssetName: '0050',
          brokerOrderNo: 'BRK-001',
          tradeDate: '2026-03-31',
          resolvedAsset: {
            id: 'asset-0050',
            symbol: '0050',
            name: 'Yuanta/P-shares Taiwan Top 50 ETF',
          },
          normalizedTransaction: {
            type: 'buy',
            quantity: '10',
            unitPrice: '100',
            currency: 'TWD',
            fees: '10',
            taxes: '0',
          },
          errors: [],
          warnings: [],
        },
      ],
    })
    commitImportTransactions.mockResolvedValueOnce({
      totalRows: 1,
      successCount: 1,
      failureCount: 0,
      createdTransactionIds: ['tx-import-1'],
    })

    renderPage()

    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalled()
    })

    const file = new File(
      ['股名,日期,成交股數\n0050,2026-03-31,10'],
      'buy-import.csv',
      { type: 'text/csv' },
    )

    fireEvent.change(screen.getByLabelText('File'), {
      target: { files: [file] },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Preview CSV' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Commit import' })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Commit import' }))

    await waitFor(() => {
      expect(commitImportTransactions).toHaveBeenCalledWith({
        accountId: 'broker-1',
        csvContent: '股名,日期,成交股數\n0050,2026-03-31,10',
      })
    })

    expect(await screen.findByText('Imported 1 transaction(s)')).toBeTruthy()
  })
})
