import { formatAssetClass, formatAssetType } from '../../lib/labels'

/**
 * Dashboard uses a mix of asset-class and asset-type ids as allocation keys
 * (plus special "marketValue" / "costBasis" slots for the holding detail
 * breakdown), so it keeps its own wrapper that delegates to the shared
 * `formatAssetClass` / `formatAssetType` helpers.
 */
export function formatAllocationLabel(
  id: string,
  fallback: string,
  t: (key: string) => string,
): string {
  switch (id) {
    case 'equity':
    case 'bond':
    case 'crypto':
    case 'cash':
    case 'precious_metal':
      return formatAssetClass(id, t)
    case 'etf':
      return formatAssetType('etf', t)
    case 'marketValue':
      return t('dashboard.marketValue')
    case 'costBasis':
      return t('dashboard.costBasis')
    default:
      return fallback
  }
}
