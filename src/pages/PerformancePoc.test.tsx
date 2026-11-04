import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../i18n'
import PerformancePoc from './PerformancePoc'

const { getAnnualRealized } = vi.hoisted(() => ({ getAnnualRealized: vi.fn() }))
vi.mock('../app/use-auth', () => ({ useAuthenticatedUser: () => ({ id: 'poc-test-user' }) }))
vi.mock('../lib/portfolio.service', () => ({ portfolioService: { getAnnualRealized } }))

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.search}</output>
}
function show(path = '/performance') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><I18nProvider><MemoryRouter initialEntries={[path]}><PerformancePoc /><LocationProbe /></MemoryRouter></I18nProvider></QueryClientProvider>)
}
beforeEach(() => {
  vi.resetAllMocks()
  localStorage.setItem('trackvest.locale', 'zh-TW')
})
afterEach(() => { cleanup(); localStorage.removeItem('trackvest.locale') })

describe('performance POC', () => {
  it('labels synthetic data and drills down from year to month without calling live APIs', () => {
    show()
    expect(screen.getByText(/所有金額、帳戶及交易皆為合成資料/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^4 月 已實現淨損益/ }))
    const summary = screen.getByRole('region', { name: '已實現績效' })
    expect(within(summary).getByText('2026 年 4 月')).toBeInTheDocument()
    expect(within(summary).getByText(/\+13,000/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查看 2330 賣出明細' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查看 0050 賣出明細' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '查看 2454 賣出明細' })).not.toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('month=4')
    expect(getAnnualRealized).not.toHaveBeenCalled()
  })

  it('keeps period scope in the URL and clears the month when changing years', () => {
    show('/performance?year=2025&month=7&account=B')
    expect(screen.getByRole('region', { name: '已實現績效' })).toHaveTextContent('-1,100')
    fireEvent.change(screen.getByRole('combobox', { name: '年份' }), { target: { value: '2026' } })
    expect(screen.getByTestId('location')).toHaveTextContent('year=2026')
    expect(screen.getByTestId('location')).not.toHaveTextContent('month=')
    expect(screen.getByRole('combobox', { name: '帳戶' })).toHaveValue('B')
  })

  it('distinguishes a month with no sales and allows returning to the full year', () => {
    show('/performance?month=5')
    expect(screen.getByText('這個期間沒有賣出紀錄')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '返回全年 →' }))
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByTestId('location')).not.toHaveTextContent('month=')
  })

  it('never substitutes demo data for a failed actual-data request', async () => {
    getAnnualRealized.mockRejectedValue(new Error('offline'))
    show('/performance?source=live')
    expect(await screen.findByRole('alert')).toHaveTextContent('年度資料暫時無法取得')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '查看 2330 賣出明細' })).not.toBeInTheDocument()
    expect(screen.queryByText(/所有金額、帳戶及交易皆為合成資料/)).not.toBeInTheDocument()
  })

  it('keeps missing realized cost distinct from a zero-sale year in actual results', async () => {
    getAnnualRealized.mockResolvedValue({
      generatedAt: '2026-11-05T00:00:00Z', timeZone: 'Asia/Taipei',
      items: [
        { year: 2026, currency: 'TWD', sellCount: 1, netProceeds: '600.12345678', disposedCost: null, realizedNetPnl: null, issues: ['MISSING_FIFO'] },
        { year: 2025, currency: 'TWD', sellCount: 0, netProceeds: '0', disposedCost: '0', realizedNetPnl: '0', issues: [] },
      ],
    })
    show('/performance?source=live')
    const summary = await screen.findByRole('region', { name: '已實現績效' })
    expect(within(summary).getAllByText('資料不足')).toHaveLength(2)
    expect(within(summary).getByText('600.12345678')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: '年份' }), { target: { value: '2025' } })
    expect(within(summary).queryByText('資料不足')).not.toBeInTheDocument()
    expect(summary).toHaveTextContent('0')
  })
})
