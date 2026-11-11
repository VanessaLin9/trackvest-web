import type { ApiSchemas } from './api-schema'

/** trackvest-api PR #52. Monetary values stay as API decimal strings. */
export type RealizedPeriods = ApiSchemas['PortfolioRealizedPeriodsResponseDto']
export type RealizedAssets = ApiSchemas['PortfolioRealizedAssetsResponseDto']
export type RealizedTrades = ApiSchemas['PortfolioRealizedTradesResponseDto']
export type RealizedSummary = ApiSchemas['PortfolioRealizedMoneySummaryDto']
export type RealizedAsset = ApiSchemas['PortfolioRealizedAssetItemDto']

export type RealizedPeriodQuery = { year: number; accountId?: string }
export type RealizedAssetsQuery = RealizedPeriodQuery & {
  currency: string
  month?: number
  skip?: number
  take?: number
}
export type RealizedTradesQuery = RealizedAssetsQuery & { assetId: string }

export const REALIZED_PAGE_SIZE = 20
