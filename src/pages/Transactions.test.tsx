import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
import Transactions from './Transactions'

const {
  getAccounts,
  getAssets,
  getTransactions,
  createTransaction,
  updateTransaction,
  removeTransaction,
  hardDeleteTransaction,
  importTransactions,
} = vi.hoisted(() => ({
  getAccounts: vi.fn(),
  getAssets: vi.fn(),
  getTransactions: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  removeTransaction: vi.fn(),
  hardDeleteTransaction: vi.fn(),
  importTransactions: vi.fn(),
}))

vi.mock('../lib/investments.service', () => ({
  investmentsService: {
    getAccounts,
    getAssets,
    getTransactions,
    createTransaction,
    updateTransaction,
    removeTransaction,
    hardDeleteTransaction,
    importTransactions,
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
    hardDeleteTransaction.mockResolvedValue({ id: 'tx-1' })
    importTransactions.mockResolvedValue({
      totalRows: 0,
      successCount: 0,
      failureCount: 0,
      createdTransactionIds: [],
      errors: [],
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    setCurrentUserId('')
  })

  function renderPage() {
    return render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>,
    )
  }

  async function switchToMode(mode: 'buy' | 'sell') {
    renderPage()

    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalled()
      expect(getAssets).toHaveBeenCalled()
      expect(getTransactions).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByRole('button', { name: mode }))
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
    fireEvent.change(screen.getByLabelText('Note'), {
      target: { value: 'Build position' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save buy' }))

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
          note: 'Build position',
        }),
      )
    })

    const payload = createTransaction.mock.calls[0][0]
    expect(payload.tradeTime).toEqual(expect.any(String))
    expect(screen.getByText('buy saved')).toBeTruthy()
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
    fireEvent.change(screen.getByLabelText('Note'), {
      target: { value: 'Trim position' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save sell' }))

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
          note: 'Trim position',
        }),
      )
    })

    const payload = createTransaction.mock.calls[0][0]
    expect(payload.tradeTime).toEqual(expect.any(String))
    expect(screen.getByText('sell saved')).toBeTruthy()
  })

  it('blocks buy submission when no tradable asset is available', async () => {
    getAssets.mockResolvedValueOnce([])

    renderPage()

    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalled()
      expect(getAssets).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'buy' }))

    fireEvent.change(screen.getByLabelText('Quantity'), {
      target: { value: '10' },
    })
    fireEvent.change(screen.getByLabelText('Price'), {
      target: { value: '100' },
    })

    const saveButton = screen.getByRole('button', { name: 'Save buy' })
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

    fireEvent.click(screen.getByRole('button', { name: 'Save buy' }))

    expect(
      await screen.findByText(
        'Quantity must be a positive number for buy transactions',
      ),
    ).toBeTruthy()
    expect(createTransaction).not.toHaveBeenCalled()
  })

  it('loads a listed sell transaction into edit mode and updates it', async () => {
    await renderPageWithTransactions()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    fireEvent.change(screen.getByLabelText('Quantity'), {
      target: { value: '8' },
    })
    fireEvent.change(screen.getByLabelText('Tax'), {
      target: { value: '8' },
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
          amount: 777,
        }),
      )
    })
  })

  it('soft deletes a listed transaction', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    await renderPageWithTransactions()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(removeTransaction).toHaveBeenCalledWith('tx-sell-1')
    })
  })

  it('hard deletes a listed transaction', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    await renderPageWithTransactions()

    fireEvent.click(screen.getByRole('button', { name: 'Hard delete' }))

    await waitFor(() => {
      expect(hardDeleteTransaction).toHaveBeenCalledWith('tx-sell-1')
    })
  })
})
