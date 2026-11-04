import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../i18n'
import type { RealizedAssets, RealizedAssetsQuery, RealizedPeriods, RealizedTrades } from '../lib/realized-performance'
import fixtures from '../lib/fixtures/realized-period-performance.fixtures.json'
import PerformancePoc from './PerformancePoc'

const mocks = vi.hoisted(() => ({
  annual: vi.fn(), periods: vi.fn(), assets: vi.fn(), trades: vi.fn(), accounts: vi.fn(),
}))
vi.mock('../app/use-auth', () => ({ useAuthenticatedUser: () => ({ id: 'live-test-user' }) }))
vi.mock('../lib/accounts.service', () => ({ accountsService: { getAccounts: mocks.accounts } }))
vi.mock('../lib/portfolio.service', () => ({ portfolioService: {
  getAnnualRealized: mocks.annual, getRealizedPeriods: mocks.periods,
  getRealizedAssets: mocks.assets, getRealizedTrades: mocks.trades,
} }))

const chain = fixtures.chain as {
  periods: RealizedPeriods; assetsYear: RealizedAssets; assetsMarch: RealizedAssets
  tradesPage1: RealizedTrades; tradesPage2: RealizedTrades
}
const missing = fixtures.missing_fifo as { periods: RealizedPeriods; assets: RealizedAssets }
const accountId = '11111111-1111-4111-8111-111111111111'

function show(path = '/performance?year=2024') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  render(<QueryClientProvider client={client}><I18nProvider><MemoryRouter initialEntries={[path]}><PerformancePoc /></MemoryRouter></I18nProvider></QueryClientProvider>)
}
const summary = () => screen.getByRole('region', { name: '已實現績效' })

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.setItem('trackvest.locale', 'zh-TW')
  mocks.accounts.mockResolvedValue([{ id: accountId, name: 'Broker TWD', currency: 'TWD' }])
  mocks.annual.mockResolvedValue({ generatedAt: chain.periods.generatedAt, timeZone: 'Asia/Taipei', items: [
    { year: 2024, currency: 'TWD', ...chain.assetsYear.summary },
    { year: 2024, currency: 'USD', ...chain.periods.groups[1].summary },
  ] })
  mocks.periods.mockResolvedValue(chain.periods)
  mocks.assets.mockImplementation(async (query: RealizedAssetsQuery) => query.month === 3 ? chain.assetsMarch : chain.assetsYear)
  mocks.trades.mockImplementation(async (query: { skip: number }) => query.skip === 20 ? chain.tradesPage2 : chain.tradesPage1)
  // jsdom lacks the native dialog lifecycle; keep the browser's open/close semantics.
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')) }
})
afterEach(() => { cleanup(); localStorage.removeItem('trackvest.locale') })

describe('live realized performance', () => {
  it('defaults to real data and carries the month into assets and sell details', async () => {
    const marchTrade = chain.tradesPage2.items.find(item => item.tradeTime.startsWith('2024-03'))!
    mocks.trades.mockResolvedValue({ ...chain.tradesPage1, scope: { ...chain.tradesPage1.scope, month: 3 },
      items: [marchTrade], total: 1, summary: chain.assetsMarch.items[0] })
    show()
    expect(await screen.findByRole('table', { name: '標的貢獻' })).toBeInTheDocument()
    expect(summary()).toHaveTextContent('+156')
    fireEvent.click(screen.getByRole('button', { name: /^3 月 已實現淨損益 \+30$/ }))
    await waitFor(() => expect(summary()).toHaveTextContent('+30'))
    expect(mocks.assets).toHaveBeenLastCalledWith({ year: 2024, month: 3, currency: 'TWD', accountId: undefined, skip: 0, take: 20 })
    fireEvent.click(screen.getByRole('button', { name: '查看 AAA 賣出明細' }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByRole('table', { name: '賣出明細' })
    expect(mocks.trades).toHaveBeenLastCalledWith({ year: 2024, month: 3, currency: 'TWD', accountId: undefined, assetId: 'asset-aaa', skip: 0, take: 20 })
    expect(dialog).toHaveTextContent('+50')
    expect(dialog).toHaveTextContent('250') // Net amount is displayed, never reduced by fee/tax again.
    expect(dialog).toHaveTextContent('2024/03/15')
    expect(screen.queryByText(/所有金額、帳戶及交易皆為合成資料/)).not.toBeInTheDocument()
  })

  it('pages sales while retaining the full-period API total', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: '查看 AAA 賣出明細' }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText('第 1–20 筆，共 22 筆')
    expect(dialog).toHaveTextContent('+176')
    fireEvent.click(within(dialog).getByRole('button', { name: '賣出下一頁' }))
    await within(dialog).findByText('第 21–22 筆，共 22 筆')
    expect(dialog).toHaveTextContent('+176')
    expect(within(dialog).getByRole('table').querySelectorAll('tbody tr')).toHaveLength(2)
    expect(mocks.trades).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 20, take: 20, assetId: 'asset-aaa' }))
    fireEvent.click(within(dialog).getByRole('button', { name: '關閉明細' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('pages assets without reducing the summary to the visible rows', async () => {
    mocks.assets.mockImplementation(async (query: RealizedAssetsQuery) => ({ ...chain.assetsYear,
      items: [chain.assetsYear.items[query.skip === 20 ? 1 : 0]], total: 21, skip: query.skip ?? 0,
    }))
    show()
    await screen.findByText('第 1–20 筆，共 21 筆')
    fireEvent.click(screen.getByRole('button', { name: '標的下一頁' }))
    await screen.findByText('第 21–21 筆，共 21 筆')
    expect(summary()).toHaveTextContent('+156')
    expect(summary()).toHaveTextContent('23')
    expect(mocks.assets).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 20, take: 20 }))
  })

  it('shows missing cost as unavailable while preserving decimal strings and complete months', async () => {
    mocks.periods.mockResolvedValue(missing.periods)
    mocks.assets.mockResolvedValue({ ...missing.assets, summary: { ...missing.assets.summary, netProceeds: '1000000000.00000001' } })
    show()
    await screen.findByRole('table', { name: '標的貢獻' })
    expect(within(summary()).getAllByText('資料不足')).toHaveLength(2)
    expect(summary()).toHaveTextContent('1,000,000,000.00000001')
    expect(screen.getByRole('button', { name: '3 月 已實現淨損益 資料不足' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '4 月 已實現淨損益 +60' })).toBeInTheDocument()
  })

  it('does not retain TWD results while a new currency loads and scopes account requests', async () => {
    let resolveUsd!: (data: RealizedAssets) => void
    const pendingUsd = new Promise<RealizedAssets>(resolve => { resolveUsd = resolve })
    mocks.assets.mockImplementation((query: RealizedAssetsQuery) => query.currency === 'USD' ? pendingUsd : Promise.resolve(chain.assetsYear))
    show()
    await screen.findByRole('table', { name: '標的貢獻' })
    fireEvent.change(screen.getByRole('combobox', { name: '原幣' }), { target: { value: 'USD' } })
    expect(screen.queryByRole('region', { name: '已實現績效' })).not.toBeInTheDocument()
    resolveUsd({ ...chain.assetsYear, scope: { ...chain.assetsYear.scope, currency: 'USD' }, summary: chain.periods.groups[1].summary, items: [], total: 0 })
    await waitFor(() => expect(summary()).toHaveTextContent('+4 USD'))
    fireEvent.change(screen.getByRole('combobox', { name: '帳戶' }), { target: { value: accountId } })
    await waitFor(() => expect(mocks.periods).toHaveBeenLastCalledWith({ year: 2024, accountId }))
    await waitFor(() => expect(mocks.assets).toHaveBeenLastCalledWith(expect.objectContaining({ accountId, currency: 'TWD', skip: 0 })))
    expect(mocks.annual).toHaveBeenLastCalledWith({ accountId })
  })

  it('reports a period API error without substituting annual or demo values', async () => {
    mocks.periods.mockRejectedValue(new Error('403'))
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('績效資料暫時無法取得')
    expect(screen.queryByRole('region', { name: '已實現績效' })).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText(/所有金額、帳戶及交易皆為合成資料/)).not.toBeInTheDocument()
    expect(mocks.assets).not.toHaveBeenCalled()
  })

  it('distinguishes absent history from a real zero-sale month', async () => {
    const empty = { ...chain.assetsYear, summary: chain.periods.groups[0].months[0], items: [], total: 0 }
    mocks.assets.mockResolvedValue(empty)
    show('/performance?year=2024&month=1')
    await screen.findByText('這個期間沒有賣出紀錄')
    expect(summary()).toHaveTextContent('2024 年 1 月')
    expect(within(summary()).queryByText('資料不足')).not.toBeInTheDocument()
    expect(summary()).toHaveTextContent('0 TWD')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows no history without inventing a zero summary', async () => {
    mocks.periods.mockResolvedValue(fixtures.dividends_only.periods)
    show()
    await screen.findByText('這個年度與幣別尚無買賣歷史。')
    expect(screen.queryByRole('region', { name: '已實現績效' })).not.toBeInTheDocument()
    expect(mocks.assets).not.toHaveBeenCalled()
  })

  it('uses backend months and keeps the monthly flow usable if the annual comparison fails', async () => {
    mocks.annual.mockRejectedValue(new Error('offline'))
    const currentGroup = { ...chain.periods.groups[0], months: chain.periods.groups[0].months.slice(0, 6) }
    mocks.periods.mockResolvedValue({ ...chain.periods, scope: { ...chain.periods.scope, year: 2026 }, groups: [currentGroup] })
    show('/performance?year=2026')
    await screen.findByRole('table', { name: '標的貢獻' })
    expect(screen.getByRole('button', { name: /^6 月 已實現淨損益/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^7 月 已實現淨損益/ })).not.toBeInTheDocument()
    expect(summary()).toHaveTextContent('+156')
    fireEvent.click(screen.getByRole('button', { name: '歷年比較', exact: true }))
    expect(await screen.findByRole('alert')).toHaveTextContent('績效資料暫時無法取得')
  })
})
