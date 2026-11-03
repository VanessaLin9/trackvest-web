import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Overview from './Overview'
import { usePreferencesStore } from '../store/preferences'

const { getSummary, getHoldings, getRebalance } = vi.hoisted(() => ({
  getSummary: vi.fn(), getHoldings: vi.fn(), getRebalance: vi.fn(),
}))
vi.mock('../app/use-auth', () => ({ useAuthenticatedUser: () => ({ id: 'test-user' }) }))
vi.mock('../i18n', () => ({ useI18n: () => ({ locale: 'zh-TW' }) }))
vi.mock('../lib/portfolio.service', () => ({ portfolioService: { getSummary, getHoldings, getRebalance } }))

function renderOverview() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<MemoryRouter><QueryClientProvider client={client}><Overview /></QueryClientProvider></MemoryRouter>)
}

beforeEach(() => {
  vi.resetAllMocks()
  usePreferencesStore.setState({ displayCurrencyMode: 'original', preferredBaseCurrency: 'TWD', allocationViewMode: 'assetClass' })
  getSummary.mockResolvedValue({
    effectiveDisplayCurrency: 'TWD', baseCurrency: 'TWD', asOf: '2026-11-03T00:00:00Z',
    marketValue: 900, investedCapital: 1000, totalPnl: -100, totalReturnRate: -0.1, holdingsCount: 1,
  })
  getHoldings.mockResolvedValue({ effectiveDisplayCurrency: 'TWD', items: [{
    assetId: 'asset-0050', symbol: '0050', name: '元大台灣50', quantity: 10,
    marketValue: 900, investedAmount: 1000, pnl: -100, returnRate: -0.1, weight: 1,
  }], allocationByAssetClass: [{ assetClass: 'equity', weight: 1, marketValue: 900 }] })
  getRebalance.mockResolvedValue({ trackedMarketValue: 900, current: { equity: 1, bond: 0 }, targets: { equity: 0.8, bond: 0.2 } })
})
afterEach(cleanup)

describe('Overview prototype', () => {
  it('shows current holdings losses and labels the 80/20 comparison as a reference', async () => {
    renderOverview()
    expect(await screen.findByRole('button', { name: '查看 0050 明細' })).toBeInTheDocument()
    expect(screen.getAllByText('-100')[0]).toHaveClass('ov-negative')
    expect(screen.getByText('目前以 80／20 作為比較基準')).toBeInTheDocument()
    expect(await screen.findByText('債券比重低於參考目標 20.0 個百分點。')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /回顧你的投資歷程/ })).toHaveAttribute('href', '/performance')
  })

  it('distinguishes request failure from an empty portfolio without inventing zero values', async () => {
    getSummary.mockRejectedValue(new Error('offline'))
    getHoldings.mockRejectedValue(new Error('offline'))
    renderOverview()
    expect(await screen.findByText('概況暫時無法取得')).toBeInTheDocument()
    expect(screen.getAllByRole('alert')).toHaveLength(2)
    expect(screen.queryByText('從第一筆投資開始')).not.toBeInTheDocument()
    expect(screen.queryByText('0.00%')).not.toBeInTheDocument()
    expect(screen.queryByText('正在讀取投資概況…')).not.toBeInTheDocument()
  })

  it('uses the returned display currency and offers recording when holdings are empty', async () => {
    usePreferencesStore.setState({ displayCurrencyMode: 'base', preferredBaseCurrency: 'USD' })
    getSummary.mockResolvedValue({ effectiveDisplayCurrency: 'TWD', baseCurrency: 'TWD', asOf: '2026-11-03T00:00:00Z', marketValue: 0, investedCapital: 0, totalPnl: 0, totalReturnRate: 0, holdingsCount: 0 })
    getHoldings.mockResolvedValue({ effectiveDisplayCurrency: 'TWD', items: [], allocationByAssetClass: [] })
    renderOverview()
    expect(await screen.findByText('從第一筆投資開始')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '新增交易 →' })).toHaveAttribute('href', '/investments')
    expect(getSummary).toHaveBeenCalledWith({ preferredBaseCurrency: 'USD' })
    expect(screen.getByText('持有 0 檔標的')).toBeInTheDocument()
    expect(screen.getAllByText('TWD', { selector: 'span' })).toHaveLength(2)
  })
  it('hides the 80/20 asset-class reference when switching to product type', async () => {
    getHoldings.mockResolvedValue({
      effectiveDisplayCurrency: 'TWD', items: [],
      allocationByAssetClass: [
        { assetClass: 'equity', weight: 0.8, marketValue: 800 },
        { assetClass: 'bond', weight: 0.2, marketValue: 200 },
      ],
      allocationByType: [
        { type: 'etf', weight: 0.7, marketValue: 700 },
        { type: 'equity', weight: 0.3, marketValue: 300 },
      ],
    })
    getRebalance.mockResolvedValue({
      trackedMarketValue: 1000,
      current: { equity: 0.8, bond: 0.2 },
      targets: { equity: 0.8, bond: 0.2 },
    })
    renderOverview()
    expect(await screen.findByText('股票類')).toBeInTheDocument()
    expect(screen.getByText('債券類')).toBeInTheDocument()
    expect(screen.getByText('80.00%')).toBeInTheDocument()
    expect(screen.getByText('20.00%')).toBeInTheDocument()
    expect(screen.getByText('股票類包含股票型 ETF；債券類包含債券型 ETF。')).toBeInTheDocument()
    expect(screen.getByText('股債配置參考 · 按資產類別')).toBeInTheDocument()
    expect(screen.queryByText('個股')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '商品類型' }))
    expect(screen.getByRole('button', { name: '商品類型' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('ETF')).toBeInTheDocument()
    expect(screen.getByText('個股')).toBeInTheDocument()
    expect(screen.getByText('70.00%')).toBeInTheDocument()
    expect(screen.getByText('30.00%')).toBeInTheDocument()
    expect(screen.queryByText('股票類')).not.toBeInTheDocument()
    expect(screen.queryByText('債券類')).not.toBeInTheDocument()
    expect(screen.getByText('ETF 獨立分類，不拆分底層資產。')).toBeInTheDocument()
    expect(screen.queryByText('股債配置參考 · 按資產類別')).not.toBeInTheDocument()
    expect(screen.queryByText('目前股債比例已符合參考目標。')).not.toBeInTheDocument()
    expect(usePreferencesStore.getState().allocationViewMode).toBe('type')
    fireEvent.click(screen.getByRole('button', { name: '資產類別' }))
    expect(screen.getByText('股票類')).toBeInTheDocument()
    expect(screen.getByText('債券類')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '資產類別' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('股債配置參考 · 按資產類別')).toBeInTheDocument()
    expect(screen.getByText('目前股債比例已符合參考目標。')).toBeInTheDocument()
  })

})
