import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../app/auth-context'
import { I18nProvider } from '../i18n'
import {
  getAnnualRealizedScenario,
} from '../lib/annual-realized'
import {
  getAssetPerformancePreview,
  getAssetPerformanceScenario,
  type PortfolioAssetPerformanceItem,
} from '../lib/asset-performance'
import Performance from './Performance'

const { getAssetPerformance, getAnnualRealized } = vi.hoisted(() => ({
  getAssetPerformance: vi.fn(),
  getAnnualRealized: vi.fn(),
}))

vi.mock('../lib/portfolio.service', () => ({
  portfolioService: {
    getAssetPerformance,
    getAnnualRealized,
  },
}))

describe('Performance page', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    window.localStorage.removeItem('trackvest.locale')
  })

  function renderPage() {
    if (!getAnnualRealized.getMockImplementation()) {
      getAnnualRealized.mockResolvedValue(getAnnualRealizedScenario('empty'))
    }
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    return render(
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider
            initialUser={{ id: 'user-1', email: 'test@example.com', role: 'user' }}
          >
            <MemoryRouter>
              <Performance />
            </MemoryRouter>
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>,
    )
  }

  it('renders original-currency groups and does not treat missing dividends as zero', async () => {
    getAssetPerformance.mockResolvedValue(getAssetPerformancePreview())
    renderPage()

    expect(await screen.findByText('TWD amounts')).toBeTruthy()
    expect(screen.getByText('Asset history results')).toBeTruthy()
    expect(screen.getByText('USD amounts')).toBeTruthy()
    expect(screen.getAllByRole('columnheader', { name: 'Realized shares' }).length).toBe(2)
    expect(screen.getByText('2.5 shares')).toBeTruthy()
    expect(screen.getByText('10 shares')).toBeTruthy()
    expect(screen.getAllByText('Not recorded').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Closed').length).toBeGreaterThan(1)
    expect(
      screen.queryByText(
        'This table is still using contract fixtures from API PR #48. It is not your live portfolio.',
      ),
    ).toBeNull()
  })

  it('filters closed rows and searches by symbol', async () => {
    getAssetPerformance.mockResolvedValue(getAssetPerformancePreview())
    renderPage()

    await screen.findByText('0050')
    fireEvent.click(screen.getByRole('button', { name: 'Closed' }))

    expect(screen.getByText('2330')).toBeTruthy()
    expect(screen.queryByText('0050')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    fireEvent.change(screen.getByPlaceholderText('Symbol or name'), {
      target: { value: 'AAPL' },
    })

    expect(screen.getAllByText('AAPL').length).toBe(2)
    expect(screen.queryByText('0050')).toBeNull()
  })

  it('paginates 20 rows on the full page', async () => {
    const template = getAssetPerformanceScenario('holding_partial_sale').items[0]
    const items: PortfolioAssetPerformanceItem[] = Array.from(
      { length: 21 },
      (_, index) => ({
        ...template,
        assetId: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
        symbol: `S${String(index).padStart(2, '0')}`,
        name: `Asset ${index}`,
      }),
    )
    getAssetPerformance.mockResolvedValue({
      generatedAt: '2026-10-31T00:00:00.000Z',
      items,
    })
    renderPage()

    expect(await screen.findByText('S00')).toBeTruthy()
    expect(screen.getByText('S19')).toBeTruthy()
    expect(screen.queryByText('S20')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('S20')).toBeTruthy()
    expect(screen.queryByText('S00')).toBeNull()
  })

  it('shows insufficient data for null P&L and Traditional Chinese copy', async () => {
    window.localStorage.setItem('trackvest.locale', 'zh-TW')
    getAssetPerformance.mockResolvedValue(getAssetPerformanceScenario('missing_price'))
    renderPage()

    expect((await screen.findAllByText('資料不足')).length).toBeGreaterThan(0)
    expect(screen.getByText('各標的歷史成果')).toBeTruthy()
    expect(screen.getByText('未登錄')).toBeTruthy()
    expect(screen.getByText('缺少可用行情')).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '已實現股數' })).toBeTruthy()
    expect(screen.getByText('2.5 股')).toBeTruthy()
    expect(screen.queryByText('0 TWD')).toBeNull()
  })

  it('keeps fractional remaining and realized shares visible in English and Traditional Chinese', async () => {
    const template = getAssetPerformanceScenario('holding_partial_sale').items[0]
    getAssetPerformance.mockResolvedValue({
      generatedAt: '2026-10-31T00:00:00.000Z',
      items: [
        {
          ...template,
          quantity: '0.00001',
          realizedQuantity: '0.00000001',
        },
      ],
    })
    renderPage()

    expect(await screen.findByText('0.00001 shares')).toBeTruthy()
    expect(screen.getByText('0.00000001 shares')).toBeTruthy()
    expect(screen.queryByText('0 shares')).toBeNull()

    cleanup()
    window.localStorage.setItem('trackvest.locale', 'zh-TW')
    renderPage()

    expect(await screen.findByText('0.00001 股')).toBeTruthy()
    expect(screen.getByText('0.00000001 股')).toBeTruthy()
    expect(screen.queryByText('0 股')).toBeNull()
  })

  it('shows realized shares as unavailable when FIFO is missing, and keeps a true zero distinct', async () => {
    getAssetPerformance.mockResolvedValue(getAssetPerformanceScenario('missing_fifo'))
    renderPage()

    expect(await screen.findByRole('columnheader', { name: 'Realized shares' })).toBeTruthy()
    expect(screen.getByText('12.5 shares')).toBeTruthy()
    expect((await screen.findAllByText('Insufficient data')).length).toBeGreaterThan(0)

    cleanup()
    getAssetPerformance.mockResolvedValue(getAssetPerformanceScenario('zero_pnl'))
    renderPage()

    expect(await screen.findByText('0 shares')).toBeTruthy()
    expect(screen.getByText('5 shares')).toBeTruthy()
    expect(screen.queryByText('Insufficient data')).toBeNull()
  })

  it('keeps an empty history state with a trade entry point', async () => {
    getAssetPerformance.mockResolvedValue(getAssetPerformanceScenario('empty'))
    renderPage()

    expect(await screen.findByText('No trades recorded yet')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Record a trade' })).toHaveAttribute(
      'href',
      '/investments',
    )
  })

  it('shows a retry action when the request fails', async () => {
    getAssetPerformance.mockRejectedValue(new Error('network down'))
    renderPage()

    expect(await screen.findByText('Could not load asset history results.')).toBeTruthy()
    getAssetPerformance.mockResolvedValue(getAssetPerformancePreview())
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('0050')).toBeTruthy()
  })

  it('shows sell-year rows in descending order and marks the open Taipei year', async () => {
    getAnnualRealized.mockResolvedValue(
      getAnnualRealizedScenario('sell_year_with_zero_year'),
    )
    renderPage()

    const table = await screen.findByRole('table', {
      name: 'Annual realized net P&L by year',
    })
    const rows = within(table).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('2026')
    expect(rows[1]).toHaveTextContent('Year to date')
    expect(rows[2]).toHaveTextContent('2025')
    expect(rows[2]).not.toHaveTextContent('Year to date')
    expect(rows[3]).toHaveTextContent('2024')
    expect(rows[3]).toHaveTextContent('0 TWD')
    expect(within(table).queryByText('Insufficient data')).toBeNull()

    const chart = screen.getByRole('list', {
      name: 'Chart order, earliest year first',
    })
    expect(within(chart).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '2024: 0 TWD',
      '2025: +100 TWD',
      '2026 Year to date: -20 TWD',
    ])
  })

  it('keeps currencies separate and does not show a combined total', async () => {
    getAnnualRealized.mockResolvedValue(getAnnualRealizedScenario('currencies'))
    renderPage()

    const table = await screen.findByRole('table', {
      name: 'Annual realized net P&L by year',
    })
    expect(within(table).getByText('+16 TWD')).toBeTruthy()
    expect(within(table).queryByText('+4 USD')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'USD' }))

    expect(await within(table).findByText('+4 USD')).toBeTruthy()
    expect(within(table).queryByText('+16 TWD')).toBeNull()
  })

  it('shows insufficient data for a missing FIFO year and zero for a year with no sells', async () => {
    getAnnualRealized.mockResolvedValue(
      getAnnualRealizedScenario('missing_fifo_and_zero'),
    )
    renderPage()

    const table = await screen.findByRole('table', {
      name: 'Annual realized net P&L by year',
    })
    const rows = within(table).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Insufficient data')
    expect(rows[1]).toHaveTextContent('600 TWD')
    expect(rows[1]).toHaveTextContent('FIFO match missing')
    expect(rows[2]).toHaveTextContent('0 TWD')
    expect(rows[2]).not.toHaveTextContent('Insufficient data')

    const chart = screen.getByRole('list', {
      name: 'Chart order, earliest year first',
    })
    expect(within(chart).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '2025: 0 TWD',
      '2026 Year to date: Insufficient data',
    ])
    expect(screen.getByText(
      'Years with insufficient data are left off the chart. They are not drawn as zero.',
    )).toBeTruthy()
  })

  it('marks 2025 as year to date when Taipei has not reached the new year', async () => {
    getAnnualRealized.mockResolvedValue(
      getAnnualRealizedScenario('taipei_before_new_year'),
    )
    renderPage()

    const table = await screen.findByRole('table', {
      name: 'Annual realized net P&L by year',
    })
    const yearToDate = within(table).getByText('Year to date')
    expect(yearToDate.closest('tr')).toHaveTextContent('2025')
    expect(yearToDate.closest('tr')).not.toHaveTextContent('2026')
  })

  it('keeps an 8-decimal realized amount visible', async () => {
    getAnnualRealized.mockResolvedValue(getAnnualRealizedScenario('fractional'))
    renderPage()

    const table = await screen.findByRole('table', {
      name: 'Annual realized net P&L by year',
    })
    expect(within(table).getByText('+1.00000001 TWD')).toBeTruthy()
    expect(within(table).queryByText('+1 TWD')).toBeNull()
  })

  it('keeps an empty annual state without hiding asset history', async () => {
    getAssetPerformance.mockResolvedValue(getAssetPerformancePreview())
    getAnnualRealized.mockResolvedValue(getAnnualRealizedScenario('empty'))
    renderPage()

    expect(await screen.findByText('No annual realized results yet')).toBeTruthy()
    expect(screen.getByText('0050')).toBeTruthy()
    expect(screen.queryByRole('table', { name: 'Annual realized net P&L by year' })).toBeNull()
  })

  it('retries the annual card without clearing asset history', async () => {
    getAssetPerformance.mockResolvedValue(getAssetPerformancePreview())
    getAnnualRealized.mockRejectedValueOnce(new Error('annual down'))
    renderPage()

    expect(await screen.findByText('Could not load annual realized net P&L.')).toBeTruthy()
    expect(screen.getByText('0050')).toBeTruthy()

    getAnnualRealized.mockResolvedValue(
      getAnnualRealizedScenario('sell_year_with_zero_year'),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    const table = await screen.findByRole('table', {
      name: 'Annual realized net P&L by year',
    })
    expect(within(table).getByText('-20 TWD')).toBeTruthy()
    expect(screen.getByText('0050')).toBeTruthy()
  })

  it('uses Traditional Chinese for the annual card', async () => {
    window.localStorage.setItem('trackvest.locale', 'zh-TW')
    getAnnualRealized.mockResolvedValue(
      getAnnualRealizedScenario('sell_year_with_zero_year'),
    )
    renderPage()

    expect(await screen.findByRole('heading', { name: '年度已實現淨損益' })).toBeTruthy()
    expect(await screen.findByText('截至目前')).toBeTruthy()
    expect(screen.getByRole('link', { name: '查看各標的歷史成果' })).toHaveAttribute(
      'href',
      '/performance#asset-history',
    )
    expect(screen.getByText(/Asia\/Taipei/)).toBeTruthy()
  })
})
