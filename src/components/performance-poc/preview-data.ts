/** Synthetic integer-valued fixtures only. Never derive the user's financial results here. */
export type PreviewSale = {
  id: string
  date: string
  symbol: string
  name: string
  account: 'A' | 'B'
  quantity: number
  proceeds: number
  cost: number
}

export const PREVIEW_YEARS = [2026, 2025, 2024]
export const PREVIEW_CURRENT_MONTH = 11
export const previewSales: PreviewSale[] = [
  { id: 'demo-01', date: '2026-01-16', symbol: '2330', name: '台積電', account: 'A', quantity: 10, proceeds: 14000, cost: 9500 },
  { id: 'demo-02', date: '2026-02-12', symbol: '2454', name: '聯發科', account: 'A', quantity: 5, proceeds: 6200, cost: 8000 },
  { id: 'demo-03', date: '2026-03-09', symbol: '0050', name: '元大台灣50', account: 'B', quantity: 100, proceeds: 18000, cost: 12000 },
  { id: 'demo-04', date: '2026-04-20', symbol: '2330', name: '台積電', account: 'A', quantity: 20, proceeds: 32000, cost: 22000 },
  { id: 'demo-05', date: '2026-04-22', symbol: '0050', name: '元大台灣50', account: 'B', quantity: 50, proceeds: 9500, cost: 6500 },
  { id: 'demo-06', date: '2026-06-18', symbol: '2454', name: '聯發科', account: 'B', quantity: 10, proceeds: 15000, cost: 16500 },
  { id: 'demo-07', date: '2026-07-06', symbol: '006208', name: '富邦台50', account: 'A', quantity: 100, proceeds: 23000, cost: 17000 },
  { id: 'demo-08', date: '2026-07-23', symbol: '2330', name: '台積電', account: 'A', quantity: 10, proceeds: 17000, cost: 11000 },
  { id: 'demo-09', date: '2026-09-11', symbol: '0050', name: '元大台灣50', account: 'B', quantity: 40, proceeds: 8000, cost: 5000 },
  { id: 'demo-10', date: '2026-10-15', symbol: '2330', name: '台積電', account: 'A', quantity: 10, proceeds: 19000, cost: 11500 },
  { id: 'demo-11', date: '2025-03-07', symbol: '0050', name: '元大台灣50', account: 'A', quantity: 30, proceeds: 4500, cost: 3900 },
  { id: 'demo-12', date: '2025-07-16', symbol: '2454', name: '聯發科', account: 'B', quantity: 5, proceeds: 6000, cost: 7100 },
  { id: 'demo-13', date: '2025-12-09', symbol: '2330', name: '台積電', account: 'A', quantity: 10, proceeds: 10500, cost: 7800 },
  { id: 'demo-14', date: '2024-05-14', symbol: '006208', name: '富邦台50', account: 'B', quantity: 20, proceeds: 2200, cost: 2000 },
]

export function previewPeriod(year: number, month: number | null, account: string) {
  return previewSales.filter(sale => Number(sale.date.slice(0, 4)) === year
    && (month === null || Number(sale.date.slice(5, 7)) === month)
    && (account === 'all' || sale.account === account))
}

export function previewSummary(sales: PreviewSale[]) {
  const proceeds = sales.reduce((sum, sale) => sum + sale.proceeds, 0)
  const cost = sales.reduce((sum, sale) => sum + sale.cost, 0)
  return { count: sales.length, proceeds, cost, pnl: proceeds - cost }
}

export function previewContributions(sales: PreviewSale[]) {
  return [...new Set(sales.map(sale => sale.symbol))].map(symbol => {
    const trades = sales.filter(sale => sale.symbol === symbol)
    return { symbol, name: trades[0].name, trades, ...previewSummary(trades) }
  }).sort((left, right) => right.pnl - left.pnl || left.symbol.localeCompare(right.symbol))
}
