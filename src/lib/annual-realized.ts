import type { ApiSchemas } from './api-schema'
import fixtureFile from './fixtures/annual-realized.fixtures.json'
import { parseDecimalString } from './formatters'

export type PortfolioAnnualRealizedItem =
  ApiSchemas['PortfolioAnnualRealizedItemResponseDto']
export type PortfolioAnnualRealizedResponse =
  ApiSchemas['PortfolioAnnualRealizedResponseDto']
export type PortfolioAnnualRealizedIssue =
  ApiSchemas['PortfolioAnnualRealizedIssue']

/**
 * 年度卡片的展示契約。數字沿用 API calculator spec 的結果，前端不另算損益。
 * 來源：trackvest-api `codex/annual-realized-pnl`（GET /portfolio/performance/annual-realized）。
 */
export type AnnualChartPoint = {
  year: number
  realizedNetPnl: string | null
  /** 只給長條高度。null 表示缺資料，不可畫成 0。 */
  chartValue: number | null
  isCurrentYear: boolean
}

type FixtureFile = {
  contract: {
    method: string
    path: string
    query: { accountId: string }
  }
  scenarios: Record<string, PortfolioAnnualRealizedResponse>
}

const fixtures = fixtureFile as FixtureFile

export function getAnnualRealizedScenario(
  name: string,
): PortfolioAnnualRealizedResponse {
  const scenario = fixtures.scenarios[name]
  if (!scenario) {
    throw new Error(`Unknown annual-realized fixture: ${name}`)
  }
  return scenario
}

/**
 * 目前年份跟回應的 timeZone，不用瀏覽器時區。
 * Asia/Taipei 下 UTC 12/31 16:00 整點起算下一年。
 */
export function yearInTimeZone(iso: string, timeZone: string): number | null {
  const instant = new Date(iso)
  if (Number.isNaN(instant.getTime())) {
    return null
  }

  try {
    const year = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
    })
      .formatToParts(instant)
      .find((part) => part.type === 'year')?.value
    if (!year || !/^\d{4}$/.test(year)) {
      return null
    }
    return Number(year)
  } catch {
    return null
  }
}

/** 幣別選擇器的順序。只列出原幣，不加總。 */
export function annualCurrencies(items: PortfolioAnnualRealizedItem[]): string[] {
  return [...new Set(items.map((item) => item.currency))].sort((left, right) =>
    left.localeCompare(right),
  )
}

/** 表格沿用 API 的 year 降冪，方便先看最近一年。 */
export function annualRowsForCurrency(
  items: PortfolioAnnualRealizedItem[],
  currency: string,
): PortfolioAnnualRealizedItem[] {
  return items
    .filter((item) => item.currency === currency)
    .sort((left, right) => right.year - left.year)
}

/**
 * 圖表改按年升冪。損益直接用 realizedNetPnl，不拿淨收款減已售成本。
 * chartValue 為 null 的年度留給表格顯示「資料不足」，不進長條圖。
 */
export function annualChartPoints(
  items: PortfolioAnnualRealizedItem[],
  currency: string,
  currentYear: number | null,
): AnnualChartPoint[] {
  return items
    .filter((item) => item.currency === currency)
    .sort((left, right) => left.year - right.year)
    .map((item) => ({
      year: item.year,
      realizedNetPnl: item.realizedNetPnl,
      chartValue: parseDecimalString(item.realizedNetPnl),
      isCurrentYear: currentYear !== null && item.year === currentYear,
    }))
}

export function plottedAnnualChartPoints(
  points: AnnualChartPoint[],
): AnnualChartPoint[] {
  return points.filter((point) => point.chartValue !== null)
}
