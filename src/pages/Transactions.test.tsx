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
  searchAssets,
  createAssetAlias,
} = vi.hoisted(() => ({
  getAccounts: vi.fn(),
  getAssets: vi.fn(),
  getTransactions: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  removeTransaction: vi.fn(),
  previewImportTransactions: vi.fn(),
  commitImportTransactions: vi.fn(),
  searchAssets: vi.fn(),
  createAssetAlias: vi.fn(),
}))

vi.mock('../lib/investments.service', async () => {
  const actual = await vi.importActual<typeof import('../lib/investments.service')>(
    '../lib/investments.service',
  )
  return {
    ...actual,
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
  }
})

vi.mock('../lib/assets.service', async () => {
  const actual = await vi.importActual<typeof import('../lib/assets.service')>(
    '../lib/assets.service',
  )
  return {
    ...actual,
    assetsService: {
      ...actual.assetsService,
      getAssets: searchAssets,
      createAssetAlias,
    },
  }
})

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
      skippedCount: 0,
      errorCount: 0,
      warningCount: 0,
      canCommit: true,
      writeOrderRowNumbers: [],
      rows: [],
    })
    commitImportTransactions.mockResolvedValue({
      totalRows: 0,
      successCount: 0,
      skippedCount: 0,
      failureCount: 0,
      createdTransactionIds: [],
    })
    searchAssets.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      take: 10,
    })
    createAssetAlias.mockResolvedValue({
      id: 'alias-1',
      assetId: 'asset-00900',
      alias: '國泰台灣領袖50',
      broker: 'cathay',
      asset: {
        id: 'asset-00900',
        symbol: '00900',
        name: '國泰台灣領袖50',
      },
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

  function buildImportCommitRejection(
    body: Record<string, unknown>,
  ) {
    return {
      response: {
        data: body,
      },
    }
  }

  const readyPreview = {
    totalRows: 1,
    readyCount: 1,
    skippedCount: 0,
    errorCount: 0,
    warningCount: 0,
    canCommit: true,
    writeOrderRowNumbers: [2],
    rows: [
      {
        row: 2,
        status: 'ready' as const,
        rawAssetName: '0050',
        brokerOrderNo: 'BRK-001',
        tradeDate: '2026-03-31',
        resolvedAsset: {
          id: 'asset-0050',
          symbol: '0050',
          name: 'Yuanta/P-shares Taiwan Top 50 ETF',
        },
        normalizedTransaction: {
          type: 'buy' as const,
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
  }

  async function previewReadyImportFile() {
    previewImportTransactions.mockResolvedValueOnce(readyPreview)

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
      skippedCount: 0,
      errorCount: 1,
      warningCount: 0,
      canCommit: false,
      writeOrderRowNumbers: [],
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
      skippedCount: 0,
      errorCount: 0,
      warningCount: 0,
      canCommit: true,
      writeOrderRowNumbers: [2],
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
      skippedCount: 0,
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

  it('keeps preview visible without success when commit is blocked by preview errors', async () => {
    renderPage()

    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalled()
    })

    await previewReadyImportFile()

    commitImportTransactions.mockRejectedValueOnce(
      buildImportCommitRejection({
        totalRows: 1,
        successCount: 0,
        skippedCount: 0,
        failureCount: 1,
        errorCode: 'COMMIT_NOT_ALLOWED_WITH_ERRORS',
        createdTransactionIds: [],
        preview: {
          totalRows: 1,
          readyCount: 0,
          skippedCount: 0,
          errorCount: 1,
          warningCount: 0,
          canCommit: false,
          writeOrderRowNumbers: [],
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
                  code: 'DUPLICATE_BROKER_ORDER_IN_FILE',
                  field: '委託書號',
                  message: 'Duplicate broker order number for selected account',
                },
              ],
              warnings: [],
            },
          ],
        },
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Commit import' }))

    expect(
      await screen.findByText('Commit is blocked until the preview allows it.'),
    ).toBeTruthy()
    expect(
      screen.getByText('Duplicate broker order number for selected account'),
    ).toBeTruthy()
    expect(screen.queryByText('Imported 1 transaction(s)')).toBeNull()
    expect(getTransactions).toHaveBeenCalledTimes(1)
  })

  it('refetches transactions after a partial import commit failure', async () => {
    renderPage()

    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalled()
      expect(getTransactions).toHaveBeenCalledTimes(1)
    })

    await previewReadyImportFile()

    commitImportTransactions.mockRejectedValueOnce(
      buildImportCommitRejection({
        totalRows: 2,
        successCount: 1,
        skippedCount: 0,
        failureCount: 1,
        errorCode: 'IMPORT_COMMIT_FAILED',
        createdTransactionIds: ['tx-import-partial-1'],
        preview: {
          totalRows: 2,
          readyCount: 1,
          skippedCount: 0,
          errorCount: 1,
          warningCount: 0,
          canCommit: false,
          writeOrderRowNumbers: [2],
          rows: [
            readyPreview.rows[0],
            {
              row: 3,
              status: 'error',
              rawAssetName: '0050',
              brokerOrderNo: 'BRK-002',
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
              errors: [
                {
                  code: 'IMPORT_COMMIT_FAILED',
                  field: 'row',
                  message: 'Amount must be a positive number',
                },
              ],
              warnings: [],
            },
          ],
        },
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Commit import' }))

    expect(
      await screen.findByText(
        '1 row(s) were saved before the failure. Review the preview and try again.',
      ),
    ).toBeTruthy()

    await waitFor(() => {
      expect(getTransactions).toHaveBeenCalledTimes(2)
    })
  })

  it('shows alias repair only for ASSET_ALIAS_NOT_FOUND and re-previews after success', async () => {
    const unresolvedPreview = {
      totalRows: 2,
      readyCount: 1,
      skippedCount: 0,
      errorCount: 1,
      warningCount: 0,
      canCommit: true,
      writeOrderRowNumbers: [2],
      rows: [
        {
          ...readyPreview.rows[0],
        },
        {
          row: 3,
          status: 'error' as const,
          rawAssetName: '國泰台灣領袖50',
          brokerOrderNo: 'BRK-002',
          tradeDate: '2026-03-31',
          resolvedAsset: null,
          normalizedTransaction: null,
          errors: [
            {
              code: 'ASSET_ALIAS_NOT_FOUND',
              field: '股名',
              message: 'Asset alias not found for 國泰台灣領袖50',
            },
          ],
          warnings: [],
        },
      ],
    }
    const repairedPreview = {
      ...unresolvedPreview,
      readyCount: 2,
      errorCount: 0,
      writeOrderRowNumbers: [2, 3],
      rows: [
        unresolvedPreview.rows[0],
        {
          ...unresolvedPreview.rows[1],
          status: 'ready' as const,
          resolvedAsset: {
            id: 'asset-00900',
            symbol: '00900',
            name: '國泰台灣領袖50',
          },
          normalizedTransaction: {
            type: 'buy' as const,
            quantity: '10',
            unitPrice: '100',
            currency: 'TWD',
            fees: '10',
            taxes: '0',
          },
          errors: [],
        },
      ],
    }

    previewImportTransactions
      .mockResolvedValueOnce(unresolvedPreview)
      .mockResolvedValueOnce(repairedPreview)
    searchAssets.mockResolvedValue({
      items: [
        {
          id: 'asset-00900',
          symbol: '00900',
          name: '國泰台灣領袖50',
          type: 'etf',
          assetClass: 'equity',
          baseCurrency: 'TWD',
        },
      ],
      total: 1,
      page: 1,
      take: 10,
    })

    renderPage()

    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalled()
    })

    const file = new File(
      ['股名,日期,成交股數\n0050,2026-03-31,10\n國泰台灣領袖50,2026-03-31,10'],
      'alias-import.csv',
      { type: 'text/csv' },
    )
    fireEvent.change(screen.getByLabelText('File'), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Preview CSV' }))

    expect(await screen.findByRole('button', { name: 'Map asset' })).toBeTruthy()
    expect(screen.getByText('Skipped')).toBeTruthy()
    expect(screen.queryByText('Commit is blocked until the preview allows it.')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Map asset' }))
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getByText('國泰台灣領袖50')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Create alias' })).toHaveProperty(
      'disabled',
      true,
    )

    fireEvent.change(screen.getByPlaceholderText('Symbol or name'), {
      target: { value: '00900' },
    })

    await waitFor(() => {
      expect(searchAssets).toHaveBeenCalledWith({
        q: '00900',
        page: 1,
        take: 10,
      })
    })

    fireEvent.click(await screen.findByRole('button', { name: /00900/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Create alias' }))

    await waitFor(() => {
      expect(createAssetAlias).toHaveBeenCalledWith('asset-00900', {
        alias: '國泰台灣領袖50',
        broker: 'cathay',
      })
    })

    await waitFor(() => {
      expect(previewImportTransactions).toHaveBeenCalledTimes(2)
      expect(previewImportTransactions).toHaveBeenLastCalledWith({
        accountId: 'broker-1',
        csvContent:
          '股名,日期,成交股數\n0050,2026-03-31,10\n國泰台灣領袖50,2026-03-31,10',
      })
    })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(commitImportTransactions).not.toHaveBeenCalled()
  })

  it('keeps the repair dialog open and shows Nest validation array messages', async () => {
    previewImportTransactions.mockResolvedValueOnce({
      totalRows: 1,
      readyCount: 0,
      skippedCount: 0,
      errorCount: 1,
      warningCount: 0,
      canCommit: false,
      writeOrderRowNumbers: [],
      rows: [
        {
          row: 2,
          status: 'error',
          rawAssetName: '國巨*',
          brokerOrderNo: 'BRK-001',
          tradeDate: '2026-03-31',
          resolvedAsset: null,
          normalizedTransaction: null,
          errors: [
            {
              code: 'ASSET_ALIAS_NOT_FOUND',
              field: '股名',
              message: 'Asset alias not found for 國巨*',
            },
          ],
          warnings: [],
        },
      ],
    })
    searchAssets.mockResolvedValue({
      items: [
        {
          id: 'asset-2327',
          symbol: '2327',
          name: '國巨',
          type: 'equity',
          assetClass: 'equity',
          baseCurrency: 'TWD',
        },
      ],
      total: 1,
      page: 1,
      take: 10,
    })
    createAssetAlias.mockRejectedValueOnce(
      Object.assign(new Error('Request failed with status code 400'), {
        response: {
          data: {
            message: ['alias contains unsupported characters'],
            error: 'Bad Request',
            statusCode: 400,
          },
        },
      }),
    )

    renderPage()

    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalled()
    })

    const file = new File(
      ['股名,日期,成交股數\n國巨*,2026-03-31,10'],
      'alias-validation.csv',
      { type: 'text/csv' },
    )
    fireEvent.change(screen.getByLabelText('File'), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Preview CSV' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Map asset' }))

    fireEvent.change(screen.getByPlaceholderText('Symbol or name'), {
      target: { value: '2327' },
    })
    fireEvent.click(await screen.findByRole('button', { name: /2327/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Create alias' }))

    expect(
      await screen.findByText('alias contains unsupported characters'),
    ).toBeTruthy()
    expect(screen.queryByText('Request failed with status code 400')).toBeNull()
    expect(screen.queryByText('Failed to create asset alias')).toBeNull()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(previewImportTransactions).toHaveBeenCalledTimes(1)
    expect(commitImportTransactions).not.toHaveBeenCalled()
    expect(createAssetAlias).toHaveBeenCalledWith('asset-2327', {
      alias: '國巨*',
      broker: 'cathay',
    })
  })

  it('keeps the repair dialog open on alias conflict and does not re-preview', async () => {
    previewImportTransactions.mockResolvedValueOnce({
      totalRows: 1,
      readyCount: 0,
      skippedCount: 0,
      errorCount: 1,
      warningCount: 0,
      canCommit: false,
      writeOrderRowNumbers: [],
      rows: [
        {
          row: 2,
          status: 'error',
          rawAssetName: '國泰台灣領袖50',
          brokerOrderNo: 'BRK-001',
          tradeDate: '2026-03-31',
          resolvedAsset: null,
          normalizedTransaction: null,
          errors: [
            {
              code: 'ASSET_ALIAS_NOT_FOUND',
              field: '股名',
              message: 'Asset alias not found for 國泰台灣領袖50',
            },
          ],
          warnings: [],
        },
      ],
    })
    searchAssets.mockResolvedValue({
      items: [
        {
          id: 'asset-00900',
          symbol: '00900',
          name: '國泰台灣領袖50',
          type: 'etf',
          assetClass: 'equity',
          baseCurrency: 'TWD',
        },
      ],
      total: 1,
      page: 1,
      take: 10,
    })
    createAssetAlias.mockRejectedValueOnce({
      response: {
        data: {
          code: 'ASSET_ALIAS_CONFLICT',
          message: 'Asset alias already maps to another asset',
          existingAsset: {
            id: 'asset-0050',
            symbol: '0050',
            name: 'Yuanta/P-shares Taiwan Top 50 ETF',
          },
        },
      },
    })

    renderPage()

    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalled()
    })

    const file = new File(
      ['股名,日期,成交股數\n國泰台灣領袖50,2026-03-31,10'],
      'alias-conflict.csv',
      { type: 'text/csv' },
    )
    fireEvent.change(screen.getByLabelText('File'), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Preview CSV' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Map asset' }))

    fireEvent.change(screen.getByPlaceholderText('Symbol or name'), {
      target: { value: '00900' },
    })
    fireEvent.click(await screen.findByRole('button', { name: /00900/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Create alias' }))

    expect(
      await screen.findByText(
        'This Cathay name already maps to 0050 · Yuanta/P-shares Taiwan Top 50 ETF. The existing mapping was not changed.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(previewImportTransactions).toHaveBeenCalledTimes(1)
    expect(commitImportTransactions).not.toHaveBeenCalled()
  })

  it('does not show alias repair for unrelated preview error codes', async () => {
    previewImportTransactions.mockResolvedValueOnce({
      totalRows: 1,
      readyCount: 0,
      skippedCount: 0,
      errorCount: 1,
      warningCount: 0,
      canCommit: false,
      writeOrderRowNumbers: [],
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
              message: 'missing broker order number',
            },
          ],
          warnings: [],
        },
      ],
    })

    renderPage()

    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalled()
    })

    const file = new File(
      ['股名,日期,成交股數\n0050,2026-03-31,10'],
      'other-error.csv',
      { type: 'text/csv' },
    )
    fireEvent.change(screen.getByLabelText('File'), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Preview CSV' }))

    expect(await screen.findByText('missing broker order number')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Map asset' })).toBeNull()
  })
})
