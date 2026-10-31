import type { ApiSchemas } from './api-schema'
import fixtureFile from './fixtures/asset-history-performance.fixtures.json'

export type PortfolioAssetPerformanceItem =
  ApiSchemas['PortfolioAssetPerformanceItemResponseDto']
export type PortfolioAssetPerformanceResponse =
  ApiSchemas['PortfolioAssetPerformanceResponseDto']
export type PortfolioAssetPerformanceStatus =
  ApiSchemas['PortfolioAssetPerformanceStatus']
export type PortfolioAssetPerformanceIssue =
  ApiSchemas['PortfolioAssetPerformanceIssue']

export type AssetPerformanceStatusFilter = 'all' | PortfolioAssetPerformanceStatus

export const ASSET_PERFORMANCE_PAGE_SIZE = 20

/**
 * CP2 preview 只組合官方 CP0 且 (assetId, currency) 不衝突的 scenarios（PR #27）。
 * 這是 mock，不是即時投組快照。來源：trackvest-api@823f70bacb03e3a22833c082a63ef263d7004556
 * fixtures 已含 API `3e48f38` 的 realizedQuantity；前端只展示、不反推賣出股數（PR #27）。
 */
const PREVIEW_SCENARIO_KEYS = [
  'holding_partial_sale',
  'closed_without_quote',
  'same_asset_different_currencies',
] as const

type FixtureFile = {
  contract: {
    method: string
    path: string
    query: { accountId: string }
  }
  scenarios: Record<string, PortfolioAssetPerformanceResponse>
}

const fixtures = fixtureFile as FixtureFile

export const assetPerformanceFixtures = fixtures

export function getAssetPerformanceScenario(
  name: string,
): PortfolioAssetPerformanceResponse {
  const scenario = fixtures.scenarios[name]
  if (!scenario) {
    throw new Error(`Unknown asset-performance fixture: ${name}`)
  }
  return scenario
}

function compareAssetPerformanceItems(
  left: PortfolioAssetPerformanceItem,
  right: PortfolioAssetPerformanceItem,
): number {
  return (
    left.symbol.localeCompare(right.symbol) ||
    left.currency.localeCompare(right.currency) ||
    left.assetId.localeCompare(right.assetId)
  )
}

export function sortAssetPerformanceItems(
  items: PortfolioAssetPerformanceItem[],
): PortfolioAssetPerformanceItem[] {
  return [...items].sort(compareAssetPerformanceItems)
}

export function getAssetPerformancePreview(): PortfolioAssetPerformanceResponse {
  const items = sortAssetPerformanceItems(
    PREVIEW_SCENARIO_KEYS.flatMap(
      (key) => getAssetPerformanceScenario(key).items,
    ),
  )

  return {
    generatedAt: getAssetPerformanceScenario('holding_partial_sale').generatedAt,
    items,
  }
}

export function filterAssetPerformanceItems(
  items: PortfolioAssetPerformanceItem[],
  options: { status: AssetPerformanceStatusFilter; query: string },
): PortfolioAssetPerformanceItem[] {
  const query = options.query.trim().toLowerCase()

  return items.filter((item) => {
    if (options.status !== 'all' && item.status !== options.status) {
      return false
    }

    if (!query) {
      return true
    }

    return (
      item.symbol.toLowerCase().includes(query) ||
      item.name.toLowerCase().includes(query)
    )
  })
}

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize = ASSET_PERFORMANCE_PAGE_SIZE,
): { items: T[]; page: number; totalPages: number; total: number } {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total,
  }
}

/** 依帳戶原幣分組展示，不跨幣加總、也不套用首頁顯示幣別（PR #27）。 */
export function groupAssetPerformanceByCurrency(
  items: PortfolioAssetPerformanceItem[],
): Array<{ currency: string; items: PortfolioAssetPerformanceItem[] }> {
  const groups: Array<{ currency: string; items: PortfolioAssetPerformanceItem[] }> =
    []
  const indexByCurrency = new Map<string, number>()

  for (const item of items) {
    const existingIndex = indexByCurrency.get(item.currency)
    if (existingIndex === undefined) {
      indexByCurrency.set(item.currency, groups.length)
      groups.push({ currency: item.currency, items: [item] })
      continue
    }

    groups[existingIndex].items.push(item)
  }

  return groups
}

/** 無股利紀錄顯示「未登錄」，不可說實際股利為 0（PR #27）。 */
export function isDividendUnrecorded(
  item: PortfolioAssetPerformanceItem,
): boolean {
  return item.recordedDividendAmount === null && item.recordedDividendCount === 0
}
