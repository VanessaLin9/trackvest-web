import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../app/auth-context'
import { I18nProvider } from '../i18n'
import {
  getAssetPerformancePreview,
  getAssetPerformanceScenario,
  type PortfolioAssetPerformanceItem,
} from '../lib/asset-performance'
import Performance from './Performance'

const { getAssetPerformance } = vi.hoisted(() => ({
  getAssetPerformance: vi.fn(),
}))

vi.mock('../lib/portfolio.service', () => ({
  portfolioService: {
    getAssetPerformance,
  },
}))

describe('Performance page', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    window.localStorage.removeItem('trackvest.locale')
  })

  function renderPage() {
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
    expect(screen.queryByText('0 TWD')).toBeNull()
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
})
