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

export type PortfolioRebalanceAllocation = {
  equity: number
  bond: number
}

export type PortfolioRebalanceMarketValue = {
  equity: number
  bond: number
}

export type PortfolioRebalanceSuggestion = {
  assetClass: AssetClass
  assetId: string
  symbol: string
  name: string
  currentMarketValue: number
  currentWeightWithinAssetClass: number
  suggestedBuyAmount: number
  estimatedQuantity: number
  latestPrice: number | null
  latestPriceCurrency: string | null
}

export type PortfolioRebalanceCandidate = {
  assetClass: Extract<AssetClass, 'equity' | 'bond'>
  assetId: string
  symbol: string
  name: string
  currentMarketValue: number
  currentWeightWithinAssetClass: number
  latestPrice: number | null
  latestPriceCurrency: string | null
  assetBaseCurrency: string
  lotSize: number | null
  minTradeUnit: number | null
}

export type PortfolioRebalanceResponse = {
  asOf: string
  displayCurrencyMode: 'portfolio-default' | 'preferred-base'
  requestedDisplayCurrency: string | null
  effectiveDisplayCurrency: string | null
  baseCurrency: string | null
  targets: PortfolioRebalanceAllocation
  current: PortfolioRebalanceAllocation
  gaps: PortfolioRebalanceAllocation
  marketValueByAssetClass: PortfolioRebalanceMarketValue
  recommendedBuyAmountByAssetClass: PortfolioRebalanceMarketValue
  trackedMarketValue: number
  candidates?: PortfolioRebalanceCandidate[]
  suggestions?: PortfolioRebalanceSuggestion[]
  notes: string[]
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

type PortfolioRebalanceQuery = PortfolioDisplayCurrencyQuery & {
  targetEquity?: number
  targetBond?: number
}

function buildPortfolioDisplayCurrencyParams(query?: PortfolioDisplayCurrencyQuery) {
  return query?.preferredBaseCurrency
    ? { preferredBaseCurrency: query.preferredBaseCurrency }
    : undefined
}

function buildPortfolioRebalanceParams(query?: PortfolioRebalanceQuery) {
  return {
    ...buildPortfolioDisplayCurrencyParams(query),
    ...(query?.targetEquity != null ? { targetEquity: query.targetEquity } : {}),
    ...(query?.targetBond != null ? { targetBond: query.targetBond } : {}),
  }
}

export const portfolioService = {
  async getSummary(query?: PortfolioDisplayCurrencyQuery): Promise<PortfolioSummary> {
    const response = await api.get<PortfolioSummary>('/portfolio/summary', {
      params: buildPortfolioDisplayCurrencyParams(query),
    })
    return response.data
  },

  async getHoldings(query?: PortfolioDisplayCurrencyQuery): Promise<PortfolioHoldingsResponse> {
    const response = await api.get<PortfolioHoldingsResponse>('/portfolio/holdings', {
      params: buildPortfolioDisplayCurrencyParams(query),
    })
    return response.data
  },

  async getTrend(query?: PortfolioDisplayCurrencyQuery): Promise<PortfolioTrendResponse> {
    const response = await api.get<PortfolioTrendResponse>('/portfolio/trend', {
      params: buildPortfolioDisplayCurrencyParams(query),
    })
    return response.data
  },

  async getRebalance(query?: PortfolioRebalanceQuery): Promise<PortfolioRebalanceResponse> {
    const response = await api.get<PortfolioRebalanceResponse>('/portfolio/rebalance', {
      params: buildPortfolioRebalanceParams(query),
    })
    return response.data
  },

  async getHoldingTrend(
    assetId: string,
    query?: PortfolioDisplayCurrencyQuery,
  ): Promise<PortfolioHoldingTrendResponse> {
    const response = await api.get<PortfolioHoldingTrendResponse>(
      `/portfolio/holdings/${assetId}/trend`,
      {
        params: buildPortfolioDisplayCurrencyParams(query),
      },
    )
    return response.data
  },
}
