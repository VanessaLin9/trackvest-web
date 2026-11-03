import type { AllocationViewMode } from '../store/preferences'
import type {
  PortfolioAllocationByAssetClass,
  PortfolioAllocationByType,
} from './portfolio.service'

/** 80/20 只跟資產類別比，不是商品類型。商品類型沒有股債目標（PR #30）。 */
export const OVERVIEW_TARGET_EQUITY = 0.8
export const OVERVIEW_TARGET_BOND = 0.2

export const OVERVIEW_HOLDING_COLORS = [
  '#367969',
  '#8cafa5',
  '#b1bfd1',
  '#b9a78e',
  '#a6a3bc',
] as const

const ALLOCATION_COLOR_BY_ID: Record<string, string> = {
  equity: '#367969',
  bond: '#8cafa5',
  etf: '#6f87a8',
  cash: '#b9a78e',
  crypto: '#a6a3bc',
  precious_metal: '#c4b07a',
}

export type OverviewAllocationItem = {
  id: string
  label: string
  weight: number
  color: string
}

type Translate = (key: string) => string

export function overviewHoldingColor(index: number): string {
  return OVERVIEW_HOLDING_COLORS[index % OVERVIEW_HOLDING_COLORS.length]
}

export function overviewAllocationColor(id: string, index: number): string {
  return ALLOCATION_COLOR_BY_ID[id] ?? overviewHoldingColor(index)
}

export function signedToneClass(value: number): 'ov-positive' | 'ov-negative' | '' {
  if (value > 0) {
    return 'ov-positive'
  }
  if (value < 0) {
    return 'ov-negative'
  }
  return ''
}

export function allocationBarPercent(weight: number): number {
  return Math.max(0, Math.min(100, weight * 100))
}

/** 資產類別用「股票類」，商品類型用「個股」；同一 id 不可共用文案（PR #30）。 */
export function overviewAllocationLabel(
  id: string,
  view: AllocationViewMode,
  t: Translate,
): string {
  if (view === 'assetClass') {
    switch (id) {
      case 'equity':
        return t('overview.classEquity')
      case 'bond':
        return t('overview.classBond')
      case 'cash':
        return t('overview.classCash')
      case 'crypto':
        return t('overview.classCrypto')
      case 'precious_metal':
        return t('overview.classPreciousMetal')
      default:
        return id
    }
  }

  switch (id) {
    case 'equity':
      return t('overview.typeEquity')
    case 'etf':
      return t('overview.typeEtf')
    case 'crypto':
      return t('overview.typeCrypto')
    case 'cash':
      return t('overview.typeCash')
    default:
      return id
  }
}

export function mapClassAllocations(
  items: PortfolioAllocationByAssetClass[],
  t: Translate,
): OverviewAllocationItem[] {
  return items.map((item, index) => ({
    id: item.assetClass,
    label: overviewAllocationLabel(item.assetClass, 'assetClass', t),
    weight: item.weight,
    color: overviewAllocationColor(item.assetClass, index),
  }))
}

export function mapTypeAllocations(
  items: PortfolioAllocationByType[],
  t: Translate,
): OverviewAllocationItem[] {
  return items.map((item, index) => ({
    id: item.type,
    label: overviewAllocationLabel(item.type, 'type', t),
    weight: item.weight,
    color: overviewAllocationColor(item.type, index),
  }))
}

/** 80/20 只跟資產類別比。gap 是目標債券比重減目前債券比重，單位為百分點。 */
export function bondGapInsight(
  gap: number,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (Math.abs(gap) < 0.01) {
    return t('overview.bondOnTarget')
  }

  if (gap > 0) {
    return t('overview.bondsBelow', { points: gap.toFixed(1) })
  }

  return t('overview.bondsAbove', { points: Math.abs(gap).toFixed(1) })
}
