import { getRequiredCurrentUserId } from '../app/current-user'
import { api } from './api'
import type { AssetClass, AssetType } from './assets.service'

export type PortfolioSummary = {
  displayCurrencyMode: 'portfolio-default' | 'preferred-base'
  requestedDisplayCurrency: string | null
  effectiveDisplayCurrency: string | null
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
  assetClass?: AssetClass | null
  quantity: number
  avgCost: number
  latestPrice: number | null
  latestPriceCurrency: string | null
  assetBaseCurrency: string
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

export type PortfolioAllocationByAssetClass = {
  assetClass: AssetClass
  marketValue: number
  weight: number
}

export type PortfolioHoldingsResponse = {
  displayCurrencyMode: 'portfolio-default' | 'preferred-base'
  requestedDisplayCurrency: string | null
  effectiveDisplayCurrency: string | null
  items: PortfolioHolding[]
  allocationByType: PortfolioAllocationByType[]
  allocationByAssetClass?: PortfolioAllocationByAssetClass[]
}

export type PortfolioTrendPoint = {
  label: string
  date: string
  investedCapital: number
  marketValue: number
}

export type PortfolioTrendResponse = {
  displayCurrencyMode: 'portfolio-default' | 'preferred-base'
  requestedDisplayCurrency: string | null
  effectiveDisplayCurrency: string | null
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
  displayCurrencyMode: 'portfolio-default' | 'preferred-base'
  requestedDisplayCurrency: string | null
  effectiveDisplayCurrency: string | null
  points: PortfolioHoldingTrendPoint[]
}

type PortfolioDisplayCurrencyQuery = {
  preferredBaseCurrency?: string
}

function buildPortfolioDisplayCurrencyParams(query?: PortfolioDisplayCurrencyQuery) {
  return query?.preferredBaseCurrency
    ? { preferredBaseCurrency: query.preferredBaseCurrency }
    : undefined
}

export const portfolioService = {
  async getSummary(query?: PortfolioDisplayCurrencyQuery): Promise<PortfolioSummary> {
    getRequiredCurrentUserId()

    const response = await api.get<PortfolioSummary>('/portfolio/summary', {
      params: buildPortfolioDisplayCurrencyParams(query),
    })
    return response.data
  },

  async getHoldings(query?: PortfolioDisplayCurrencyQuery): Promise<PortfolioHoldingsResponse> {
    getRequiredCurrentUserId()

    const response = await api.get<PortfolioHoldingsResponse>('/portfolio/holdings', {
      params: buildPortfolioDisplayCurrencyParams(query),
    })
    return response.data
  },

  async getTrend(query?: PortfolioDisplayCurrencyQuery): Promise<PortfolioTrendResponse> {
    getRequiredCurrentUserId()

    const response = await api.get<PortfolioTrendResponse>('/portfolio/trend', {
      params: buildPortfolioDisplayCurrencyParams(query),
    })
    return response.data
  },

  async getHoldingTrend(
    assetId: string,
    query?: PortfolioDisplayCurrencyQuery,
  ): Promise<PortfolioHoldingTrendResponse> {
    getRequiredCurrentUserId()

    const response = await api.get<PortfolioHoldingTrendResponse>(
      `/portfolio/holdings/${assetId}/trend`,
      {
        params: buildPortfolioDisplayCurrencyParams(query),
      },
    )
    return response.data
  },
}
