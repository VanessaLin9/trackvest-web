import { api } from './api'
import type { ApiSchemas } from './api-schema'
import type { AssetClass, AssetType } from './assets.service'
import type { PortfolioAnnualBuysResponse } from './annual-buys'
import type { PortfolioAnnualRealizedResponse } from './annual-realized'
import type { PortfolioAssetPerformanceResponse } from './asset-performance'
import type {
  RealizedPeriods, RealizedAssets, RealizedTrades,
  RealizedPeriodQuery, RealizedAssetsQuery, RealizedTradesQuery,
} from './realized-performance'

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

/** 持倉列來自 OpenAPI。最近動作是 type / tradeDate / note，不是英文句子（PR #26）。 */
export type PortfolioHolding = ApiSchemas['PortfolioHoldingItemResponseDto']

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
  async getRealizedPeriods(query: RealizedPeriodQuery): Promise<RealizedPeriods> {
    const response = await api.get<RealizedPeriods>('/portfolio/performance/realized/periods', { params: query })
    return response.data
  },

  async getRealizedAssets(query: RealizedAssetsQuery): Promise<RealizedAssets> {
    const response = await api.get<RealizedAssets>('/portfolio/performance/realized/assets', { params: query })
    return response.data
  },

  async getRealizedTrades(query: RealizedTradesQuery): Promise<RealizedTrades> {
    const response = await api.get<RealizedTrades>('/portfolio/performance/realized/trades', { params: query })
    return response.data
  },

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

  /**
   * 讀取各標的歷史成果（PR #27 CP3）。金額由 API 算好，前端只做顯示。
   * 對應 GET /portfolio/performance/assets；可選 accountId 必須是自己的帳戶。
   * realizedQuantity 同樣只展示，不從剩餘股數或損益反推（PR #27）。
   */
  async getAssetPerformance(query?: {
    accountId?: string
  }): Promise<PortfolioAssetPerformanceResponse> {
    const response = await api.get<PortfolioAssetPerformanceResponse>(
      '/portfolio/performance/assets',
      {
        params: query?.accountId ? { accountId: query.accountId } : undefined,
      },
    )
    return response.data
  },

  /**
   * 讀取年度已實現淨損益（PR #28）。金額由 API 算好，前端只依原幣分組展示。
   * 對應 GET /portfolio/performance/annual-realized；可選 accountId 必須是自己的帳戶。
   */
  async getAnnualRealized(query?: {
    accountId?: string
  }): Promise<PortfolioAnnualRealizedResponse> {
    const response = await api.get<PortfolioAnnualRealizedResponse>(
      '/portfolio/performance/annual-realized',
      {
        params: query?.accountId ? { accountId: query.accountId } : undefined,
      },
    )
    return response.data
  },

  /**
   * 讀取年度買進金額與類型配置（PR #29）。金額與占比由 API 算好，前端只展示。
   * 對應 GET /portfolio/performance/annual-buys；可選 accountId 必須是自己的帳戶。
   */
  async getAnnualBuys(query?: {
    accountId?: string
  }): Promise<PortfolioAnnualBuysResponse> {
    const response = await api.get<PortfolioAnnualBuysResponse>(
      '/portfolio/performance/annual-buys',
      {
        params: query?.accountId ? { accountId: query.accountId } : undefined,
      },
    )
    return response.data
  },
}
