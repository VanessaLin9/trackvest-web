import { describe, expect, it } from 'vitest'
import {
  annualChartPoints,
  annualCurrencies,
  annualRowsForCurrency,
  getAnnualRealizedScenario,
  plottedAnnualChartPoints,
  yearInTimeZone,
} from './annual-realized'

describe('annual realized fixtures', () => {
  it('keeps a true zero year distinct from a missing FIFO year', () => {
    const response = getAnnualRealizedScenario('missing_fifo_and_zero')
    const missing = response.items.find((item) => item.year === 2026)
    const zero = response.items.find((item) => item.year === 2025)

    expect(missing?.realizedNetPnl).toBeNull()
    expect(missing?.disposedCost).toBeNull()
    expect(missing?.netProceeds).toBe('600')
    expect(missing?.issues).toEqual(['MISSING_FIFO'])
    expect(zero?.sellCount).toBe(0)
    expect(zero?.realizedNetPnl).toBe('0')
  })

  it('does not add TWD and USD into one total', () => {
    const items = getAnnualRealizedScenario('currencies').items

    expect(annualCurrencies(items)).toEqual(['TWD', 'USD'])
    expect(annualRowsForCurrency(items, 'TWD').map((item) => item.realizedNetPnl)).toEqual([
      '16',
    ])
    expect(annualRowsForCurrency(items, 'USD').map((item) => item.realizedNetPnl)).toEqual([
      '4',
    ])
  })
})

describe('annual realized year boundary', () => {
  it('uses Asia/Taipei, including the UTC 12/31 16:00 boundary', () => {
    expect(yearInTimeZone('2025-12-31T15:59:59.000Z', 'Asia/Taipei')).toBe(2025)
    expect(yearInTimeZone('2025-12-31T16:00:00.000Z', 'Asia/Taipei')).toBe(2026)
    expect(yearInTimeZone('not-a-date', 'Asia/Taipei')).toBeNull()
    expect(yearInTimeZone('2026-06-15T04:00:00.000Z', 'Not/AZone')).toBeNull()
  })

  it('marks only the response year as current, not the machine year', () => {
    const before = getAnnualRealizedScenario('taipei_before_new_year')
    const after = getAnnualRealizedScenario('taipei_new_year')
    const beforeYear = yearInTimeZone(before.generatedAt, before.timeZone)
    const afterYear = yearInTimeZone(after.generatedAt, after.timeZone)

    const beforePoints = annualChartPoints(before.items, 'TWD', beforeYear)
    const afterPoints = annualChartPoints(after.items, 'TWD', afterYear)

    expect(beforePoints.find((point) => point.isCurrentYear)?.year).toBe(2025)
    expect(afterPoints.find((point) => point.isCurrentYear)?.year).toBe(2026)
    expect(afterPoints.filter((point) => point.isCurrentYear)).toHaveLength(1)
  })
})

describe('annual realized chart order', () => {
  it('plots years ascending and keeps a zero bar while omitting null P&L', () => {
    const response = getAnnualRealizedScenario('sell_year_with_zero_year')
    const currentYear = yearInTimeZone(response.generatedAt, response.timeZone)
    const points = annualChartPoints(response.items, 'TWD', currentYear)

    expect(annualRowsForCurrency(response.items, 'TWD').map((item) => item.year)).toEqual([
      2026, 2025, 2024,
    ])
    expect(points.map((point) => point.year)).toEqual([2024, 2025, 2026])
    expect(points.map((point) => point.chartValue)).toEqual([0, 100, -20])
    expect(points.find((point) => point.year === 2026)?.isCurrentYear).toBe(true)

    const missing = annualChartPoints(
      getAnnualRealizedScenario('missing_fifo_and_zero').items,
      'TWD',
      2026,
    )
    expect(missing.map((point) => point.chartValue)).toEqual([0, null])
    expect(plottedAnnualChartPoints(missing).map((point) => point.year)).toEqual([2025])
  })
})
