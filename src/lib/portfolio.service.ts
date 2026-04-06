import { getRequiredCurrentUserId } from '../app/current-user'
import { api } from './api'
import type { AssetType } from './assets.service'

export type PortfolioSummary = {
  asOf: string
  baseCurrency: string | null
  investedCapital: number
  marketValue: number
  totalPnl: number
  totalReturnRate: number
  holdingsCount: number
}

export type PortfolioHolding = {
  assetId: string
  symbol: string
  name: string
  type: AssetType
  quantity: number
  avgCost: number
  latestPrice: number | null
  investedAmount: number
  marketValue: number
  pnl: number
  returnRate: number
  weight: number
  lastActivitySummary: string | null
}

export type PortfolioAllocationByType = {
  type: AssetType
  marketValue: number
  weight: number
}

export type PortfolioHoldingsResponse = {
  items: PortfolioHolding[]
  allocationByType: PortfolioAllocationByType[]
}

export type PortfolioTrendPoint = {
  label: string
  date: string
  investedCapital: number
  marketValue: number
}

export type PortfolioTrendResponse = {
  points: PortfolioTrendPoint[]
}

export type PortfolioHoldingTrendPoint = {
  label: string
  date: string
  investedAmount: number
  marketValue: number
}

export type PortfolioHoldingTrendResponse = {
  assetId: string
  points: PortfolioHoldingTrendPoint[]
}

export const portfolioService = {
  async getSummary(): Promise<PortfolioSummary> {
    getRequiredCurrentUserId()

    const response = await api.get<PortfolioSummary>('/portfolio/summary')
    return response.data
  },

  async getHoldings(): Promise<PortfolioHoldingsResponse> {
    getRequiredCurrentUserId()

    const response = await api.get<PortfolioHoldingsResponse>('/portfolio/holdings')
    return response.data
  },

  async getTrend(): Promise<PortfolioTrendResponse> {
    getRequiredCurrentUserId()

    const response = await api.get<PortfolioTrendResponse>('/portfolio/trend')
    return response.data
  },

  async getHoldingTrend(assetId: string): Promise<PortfolioHoldingTrendResponse> {
    getRequiredCurrentUserId()

    const response = await api.get<PortfolioHoldingTrendResponse>(
      `/portfolio/holdings/${assetId}/trend`,
    )
    return response.data
  },
}
