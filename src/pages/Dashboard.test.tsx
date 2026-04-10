import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setCurrentUserId } from '../app/current-user'
import { I18nProvider } from '../i18n'
import Dashboard from './Dashboard'
import { usePreferencesStore } from '../store/preferences'

const {
  getSummary,
  getHoldings,
  getTrend,
  getHoldingTrend,
} = vi.hoisted(() => ({
  getSummary: vi.fn(),
  getHoldings: vi.fn(),
  getTrend: vi.fn(),
  getHoldingTrend: vi.fn(),
}))

vi.mock('../lib/portfolio.service', () => ({
  portfolioService: {
    getSummary,
    getHoldings,
    getTrend,
    getHoldingTrend,
  },
}))

vi.mock('../components/dashboard/PortfolioCharts', () => ({
  AllocationChartCard: ({ title }: { title: string }) => <div>{title}</div>,
  PerformanceChartCard: ({ title }: { title: string }) => <div>{title}</div>,
  PortfolioTrendChartCard: ({ title }: { title: string }) => <div>{title}</div>,
  HoldingTrendChartCard: ({ title }: { title: string }) => <div>{title}</div>,
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Pie: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Cell: () => <div />,
  Tooltip: () => <div />,
  BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Bar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Area: () => <div />,
}))

describe('Dashboard smoke tests', () => {
  const twdSummary = {
    asOf: '2026-03-27T09:00:00.000Z',
    displayCurrencyMode: 'portfolio-default' as const,
    requestedDisplayCurrency: null,
    effectiveDisplayCurrency: 'TWD',
    baseCurrency: 'TWD',
    investedCapital: 23726,
    marketValue: 25150,
    totalPnl: 1424,
    totalReturnRate: 0.06001855,
    holdingsCount: 2,
  }

  const usdSummary = {
    asOf: '2026-03-27T09:00:00.000Z',
    displayCurrencyMode: 'preferred-base' as const,
    requestedDisplayCurrency: 'USD',
    effectiveDisplayCurrency: 'USD',
    baseCurrency: 'USD',
    investedCapital: 741.20024,
    marketValue: 785.686,
    totalPnl: 44.48576,
    totalReturnRate: 0.06001855,
    holdingsCount: 2,
  }

  const twdHoldings = {
    displayCurrencyMode: 'portfolio-default' as const,
    requestedDisplayCurrency: null,
    effectiveDisplayCurrency: 'TWD',
    items: [
      {
        assetId: 'asset-2330',
        symbol: '2330',
        name: 'TSMC',
        type: 'equity' as const,
        quantity: 20,
        avgCost: 901,
        latestPrice: 950,
        latestPriceCurrency: 'TWD',
        assetBaseCurrency: 'TWD',
        investedAmount: 18020,
        marketValue: 19000,
        pnl: 980,
        returnRate: 0.05438402,
        weight: 0.7554672,
        lastActivitySummary: '台積電股利入帳',
      },
      {
        assetId: 'asset-0050',
        symbol: '0050',
        name: 'Taiwan 50 ETF',
        type: 'etf' as const,
        quantity: 30,
        avgCost: 190.2,
        latestPrice: 205,
        latestPriceCurrency: 'TWD',
        assetBaseCurrency: 'TWD',
        investedAmount: 5706,
        marketValue: 6150,
        pnl: 444,
        returnRate: 0.07781283,
        weight: 0.2445328,
        lastActivitySummary: '0050 部分獲利了結',
      },
    ],
    allocationByType: [
      {
        type: 'equity' as const,
        marketValue: 19000,
        weight: 0.7554672,
      },
      {
        type: 'etf' as const,
        marketValue: 6150,
        weight: 0.2445328,
      },
    ],
  }

  const usdHoldings = {
    displayCurrencyMode: 'preferred-base' as const,
    requestedDisplayCurrency: 'USD',
    effectiveDisplayCurrency: 'USD',
    items: [
      {
        ...twdHoldings.items[0],
        avgCost: 28.14724,
        investedAmount: 562.9448,
        marketValue: 593.56,
        pnl: 30.6152,
      },
      {
        ...twdHoldings.items[1],
        avgCost: 5.941848,
        investedAmount: 178.25544,
        marketValue: 192.126,
        pnl: 13.87056,
      },
    ],
    allocationByType: [
      {
        type: 'equity' as const,
        marketValue: 593.56,
        weight: 0.7554672,
      },
      {
        type: 'etf' as const,
        marketValue: 192.126,
        weight: 0.2445328,
      },
    ],
  }

  const twdTrend = {
    displayCurrencyMode: 'portfolio-default' as const,
    requestedDisplayCurrency: null,
    effectiveDisplayCurrency: 'TWD',
    points: [
      {
        label: '2026-03-20',
        date: '2026-03-20',
        investedCapital: 23726,
        marketValue: 24000,
      },
      {
        label: '2026-03-27',
        date: '2026-03-27',
        investedCapital: 23726,
        marketValue: 25150,
      },
    ],
  }

  const usdTrend = {
    displayCurrencyMode: 'preferred-base' as const,
    requestedDisplayCurrency: 'USD',
    effectiveDisplayCurrency: 'USD',
    points: [
      {
        label: '2026-03-20',
        date: '2026-03-20',
        investedCapital: 742.14928,
        marketValue: 750.72,
      },
      {
        label: '2026-03-27',
        date: '2026-03-27',
        investedCapital: 741.20024,
        marketValue: 785.686,
      },
    ],
  }

  const twdHoldingTrend = {
    assetId: 'asset-2330',
    displayCurrencyMode: 'portfolio-default' as const,
    requestedDisplayCurrency: null,
    effectiveDisplayCurrency: 'TWD',
    points: [
      {
        label: '2026-03-20',
        date: '2026-03-20',
        investedAmount: 18020,
        marketValue: 18000,
      },
      {
        label: '2026-03-27',
        date: '2026-03-27',
        investedAmount: 18020,
        marketValue: 19000,
      },
    ],
  }

  const usdHoldingTrend = {
    assetId: 'asset-2330',
    displayCurrencyMode: 'preferred-base' as const,
    requestedDisplayCurrency: 'USD',
    effectiveDisplayCurrency: 'USD',
    points: [
      {
        label: '2026-03-20',
        date: '2026-03-20',
        investedAmount: 563.6656,
        marketValue: 563.04,
      },
      {
        label: '2026-03-27',
        date: '2026-03-27',
        investedAmount: 562.9448,
        marketValue: 593.56,
      },
    ],
  }

  beforeEach(() => {
    setCurrentUserId('user-1')
    usePreferencesStore.setState({
      displayCurrencyMode: 'original',
      preferredBaseCurrency: 'TWD',
    })

    getSummary.mockResolvedValue(twdSummary)
    getHoldings.mockResolvedValue(twdHoldings)
    getTrend.mockResolvedValue(twdTrend)
    getHoldingTrend.mockResolvedValue(twdHoldingTrend)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    setCurrentUserId('')
    usePreferencesStore.setState({
      displayCurrencyMode: 'original',
      preferredBaseCurrency: 'TWD',
    })
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
          <Dashboard />
        </I18nProvider>
      </QueryClientProvider>,
    )
  }

  it('renders summary cards and holdings rows from portfolio responses', async () => {
    renderPage()

    await waitFor(() => {
      expect(getSummary).toHaveBeenCalledTimes(1)
      expect(getHoldings).toHaveBeenCalledTimes(1)
      expect(getTrend).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Portfolio overview')).toBeTruthy()
      expect(screen.getByText('Tracked assets')).toBeTruthy()
      expect(screen.getByText('23,726 TWD')).toBeTruthy()
      expect(screen.getByText('25,150 TWD')).toBeTruthy()
      expect(screen.getByText('2330')).toBeTruthy()
      expect(screen.getByText('0050')).toBeTruthy()
    })
  })

  it('switches selected holding detail when a holdings row is clicked', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '2330' })).toBeTruthy()
      expect(screen.getByText('台積電股利入帳')).toBeTruthy()
    })

    fireEvent.click(screen.getByText('Taiwan 50 ETF'))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '0050' })).toBeTruthy()
      expect(screen.getByText('0050 部分獲利了結')).toBeTruthy()
    })
  })

  it('uses quote currency for latest price while normalized values keep effective display currency', async () => {
    getSummary.mockResolvedValue(usdSummary)
    getHoldings.mockResolvedValue({
      ...usdHoldings,
      items: [
        {
          ...usdHoldings.items[0],
          latestPrice: 950,
          latestPriceCurrency: 'TWD',
          assetBaseCurrency: 'TWD',
        },
      ],
    })
    getTrend.mockResolvedValue(usdTrend)
    getHoldingTrend.mockResolvedValue(usdHoldingTrend)
    usePreferencesStore.setState({
      displayCurrencyMode: 'base',
      preferredBaseCurrency: 'USD',
    })

    renderPage()

    await waitFor(() => {
      expect(getSummary).toHaveBeenCalledWith({ preferredBaseCurrency: 'USD' })
      expect(getHoldings).toHaveBeenCalledWith({ preferredBaseCurrency: 'USD' })
      expect(getTrend).toHaveBeenCalledWith({ preferredBaseCurrency: 'USD' })
      expect(getHoldingTrend).toHaveBeenCalledWith('asset-2330', {
        preferredBaseCurrency: 'USD',
      })
      expect(screen.getByText('741.2 USD')).toBeTruthy()
      expect(screen.getByText('950 TWD')).toBeTruthy()
    })
  })

  it('refetches portfolio queries when preferred base mode is enabled', async () => {
    getSummary.mockImplementation(async (query?: { preferredBaseCurrency?: string }) =>
      query?.preferredBaseCurrency === 'USD' ? usdSummary : twdSummary,
    )
    getHoldings.mockImplementation(async (query?: { preferredBaseCurrency?: string }) =>
      query?.preferredBaseCurrency === 'USD' ? usdHoldings : twdHoldings,
    )
    getTrend.mockImplementation(async (query?: { preferredBaseCurrency?: string }) =>
      query?.preferredBaseCurrency === 'USD' ? usdTrend : twdTrend,
    )
    getHoldingTrend.mockImplementation(
      async (_assetId: string, query?: { preferredBaseCurrency?: string }) =>
        query?.preferredBaseCurrency === 'USD' ? usdHoldingTrend : twdHoldingTrend,
    )

    renderPage()

    await waitFor(() => {
      expect(getSummary).toHaveBeenCalledTimes(1)
      expect(screen.getByText('23,726 TWD')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'USD' }))
    fireEvent.click(screen.getByRole('button', { name: 'Preferred base' }))

    await waitFor(() => {
      expect(getSummary).toHaveBeenLastCalledWith({ preferredBaseCurrency: 'USD' })
      expect(getHoldings).toHaveBeenLastCalledWith({ preferredBaseCurrency: 'USD' })
      expect(getTrend).toHaveBeenLastCalledWith({ preferredBaseCurrency: 'USD' })
      expect(getHoldingTrend).toHaveBeenLastCalledWith('asset-2330', {
        preferredBaseCurrency: 'USD',
      })
      expect(screen.getByText('785.69 USD')).toBeTruthy()
    })
  })
})
