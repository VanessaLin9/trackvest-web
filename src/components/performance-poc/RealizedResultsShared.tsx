import { formatSnapshotDate, parseDecimalString } from '../../lib/formatters'
import type { RealizedSummary } from '../../lib/realized-performance'
import { pnlClass, useRealizedText } from './use-realized-text'

export function RealizedSummaryCard({ summary, scope, currency, generatedAt, asOf }: {
  summary: RealizedSummary; scope: string; currency: string; generatedAt: string; asOf: string | null
}) {
  const { text, locale, amount, signed } = useRealizedText()
  const pnl = signed(summary.realizedNetPnl)
  const hasLongAmount = [pnl, amount(summary.netProceeds), amount(summary.disposedCost)].some(value => value.length > 12)
  return <section className={`pf-summary ${hasLongAmount ? 'pf-precise-summary' : ''}`} aria-label={text('realized')}>
    <div className="pf-summary-title">{scope}{asOf && <span className="pf-badge">{text('inProgress')}</span>}</div>
    <div className="pf-summary-grid">
      <div><p>{text('pnl')}</p><strong className={`pf-main-value ${pnl.length > 12 ? 'pf-long-value' : ''} ${pnlClass(summary.realizedNetPnl)}`}>{pnl} <small>{currency}</small></strong></div>
      <dl>
        <div><dt>{text('proceeds')}</dt><dd>{amount(summary.netProceeds)}</dd></div>
        <div><dt>{text('cost')}</dt><dd>{amount(summary.disposedCost)}</dd></div>
        <div><dt>{text('sellCount')}</dt><dd>{summary.sellCount}</dd></div>
      </dl>
    </div>
    <p className="pf-caption">{text('noReturn')} · {text('asOf', { date: formatSnapshotDate(generatedAt, locale) })}</p>
    {summary.issues.includes('MISSING_FIFO') && <p className="pf-data-warning">{text('missingFifo')}</p>}
  </section>
}

export function RealizedError({ retry }: { retry: () => void }) {
  const { text } = useRealizedText()
  return <div className="pf-empty" role="alert"><p>{text('periodError')}</p><button onClick={retry}>{text('retry')}</button></div>
}

export function RealizedPages({ skip, take, total, onPage, kind }: {
  skip: number; take: number; total: number; onPage: (skip: number) => void; kind: 'assets' | 'trades'
}) {
  const { text } = useRealizedText()
  return <div className="pf-pagination">
    <span>{text('pageRange', { start: total ? Math.min(skip + 1, total) : 0, end: Math.min(skip + take, total), total })}</span>
    <div>
      <button disabled={skip === 0} aria-label={text(kind === 'assets' ? 'previousAssets' : 'previousTrades')} onClick={() => onPage(Math.max(0, skip - take))}>{text('previousPage')}</button>
      <button disabled={skip + take >= total} aria-label={text(kind === 'assets' ? 'nextAssets' : 'nextTrades')} onClick={() => onPage(skip + take)}>{text('nextPage')}</button>
    </div>
  </div>
}

export type RealizedBar = { value: number; label: string; pnl: string | null; current?: boolean }

/** Only bar geometry uses number; all displayed financial values use decimal strings. */
export function RealizedChart({ bars, selected, onSelect, years }: {
  bars: RealizedBar[]; selected: number | undefined; onSelect: (value: number) => void; years: boolean
}) {
  const { text, signed } = useRealizedText()
  const heights = bars.map(bar => parseDecimalString(bar.pnl))
  const max = Math.max(1, ...heights.map(value => Math.abs(value ?? 0)))
  return <div className="pf-chart-scroll"><div className={`pf-chart ${years ? 'pf-year-chart' : ''}`}>
    {bars.map((bar, index) => {
      const value = heights[index]
      return <button key={bar.value} className={`pf-chart-column ${value !== null && value < 0 ? 'pf-chart-loss' : ''} ${value === null ? 'pf-chart-missing' : ''}`}
        aria-pressed={selected === bar.value} aria-label={`${bar.label} ${text('pnl')} ${signed(bar.pnl)}`} title={`${bar.label}: ${signed(bar.pnl)}`}
        onClick={() => onSelect(bar.value)}>
        <span className="pf-chart-value">{signed(bar.pnl)}</span>
        <span className="pf-chart-positive"><span style={{ height: `${Math.max(0, value ?? 0) / max * 80}px` }} /></span>
        <span className="pf-chart-negative"><span style={{ height: `${Math.max(0, -(value ?? 0)) / max * 80}px` }} /></span>
        <span className="pf-chart-label">{bar.label}{bar.current && <span className="pf-current-month">{text('currentMonth')}</span>}</span>
      </button>
    })}
  </div></div>
}
