/**
 * Centralised chart / data-viz color tokens.
 *
 * Values mirror Tailwind palette names so they stay aligned with the utility
 * classes used elsewhere. When adding a new chart color, prefer referencing
 * an existing token over introducing a new hex value.
 */

export const chartColors = {
  equity: '#2563eb', //                    blue-600 (primary accent)
  bond: '#14b8a6', //                      teal-500
  etf: '#0f766e', //                       teal-700
  crypto: '#f59e0b', //                    amber-500
  cash: '#9333ea', //                      purple-600
  preciousMetal: '#ca8a04', //             yellow-600
  neutral: '#94a3b8', //                   slate-400

  positive: '#0f766e', //                  teal-700 (gain)
  negative: '#dc2626', //                  red-600 (loss)

  /** Primary area / line color, aligned with `chartColors.equity`. */
  primary: '#2563eb',

  gridStroke: '#e5e7eb', //                gray-200
  gridStrokeAlt: '#e2e8f0', //             slate-200

  rebalanceTargetEquity: '#93c5fd', //     blue-300
  rebalanceTargetBond: '#99f6e4', //       teal-200

  costBasis: '#cbd5e1', //                 slate-300
  investedArea: '#94a3b8', //              slate-400
  investedStroke: '#64748b', //            slate-500
} as const

/** Color palette used when cycling through an arbitrary list (e.g. holdings). */
export const PORTFOLIO_PALETTE: readonly string[] = [
  chartColors.etf,
  chartColors.equity,
  chartColors.crypto,
  chartColors.cash,
  '#ef4444', //                            red-500
]

/** Bar / cell color based on P&L sign. */
export function getPnlColor(pnl: number): string {
  if (pnl > 0) return chartColors.positive
  if (pnl < 0) return chartColors.negative
  return chartColors.neutral
}

/**
 * Color for allocation breakdowns, keyed by `AssetClass` or `AssetType`.
 * Unknown keys fall back to a neutral slate so new values degrade gracefully.
 */
export function getAllocationColor(kind: string): string {
  switch (kind) {
    case 'equity':
      return chartColors.equity
    case 'bond':
      return chartColors.bond
    case 'etf':
      return chartColors.etf
    case 'crypto':
      return chartColors.crypto
    case 'cash':
      return chartColors.cash
    case 'precious_metal':
      return chartColors.preciousMetal
    default:
      return chartColors.neutral
  }
}
