import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { formatCurrency, formatSignedCurrency } from '../../lib/formatters'
import {
  PREVIEW_CURRENT_MONTH, PREVIEW_YEARS,
  previewContributions, previewPeriod, previewSummary,
} from './preview-data'

export function RealizedExplorer() {
  const { t, locale } = useI18n()
  const text = (key: string, values?: Record<string, string | number>) => t(`performancePoc.${key}`, values)
  const [params, setParams] = useSearchParams()
  const requestedYear = Number(params.get('year'))
  const year = PREVIEW_YEARS.includes(requestedYear) ? requestedYear : 2026
  const maxMonth = year === 2026 ? PREVIEW_CURRENT_MONTH : 12
  const requestedMonth = Number(params.get('month'))
  const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= maxMonth ? requestedMonth : null
  const account = ['A', 'B'].includes(params.get('account') ?? '') ? params.get('account')! : 'all'

  function updateScope(values: Record<string, string | null>) {
    setParams(current => {
      const next = new URLSearchParams(current)
      for (const [key, value] of Object.entries(values)) {
        if (value === null) next.delete(key)
        else next.set(key, value)
      }
      return next
    })
    setSearch('')
  }
  function setMonth(value: number | null) {
    updateScope({ month: value === null ? null : String(value) })
  }
  const [view, setView] = useState<'months' | 'years'>('months')
  const [search, setSearch] = useState('')
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const sales = previewPeriod(year, month, account)
  const summary = previewSummary(sales)
  const contributions = previewContributions(sales)
  const filtered = contributions.filter(item => `${item.symbol} ${item.name}`.toLowerCase().includes(search.trim().toLowerCase()))
  const selected = contributions.find(item => item.symbol === selectedSymbol)
  const scope = month === null ? text('yearScope', { year }) : text('monthScope', { year, month })
  const monthCount = year === 2026 ? PREVIEW_CURRENT_MONTH : 12
  const bars = view === 'months'
    ? Array.from({ length: monthCount }, (_, index) => ({
        value: index + 1,
        label: text('month', { month: index + 1 }),
        pnl: previewSummary(previewPeriod(year, index + 1, account)).pnl,
      }))
    : [...PREVIEW_YEARS].reverse().map(value => ({
        value, label: String(value), pnl: previewSummary(previewPeriod(value, null, account)).pnl,
      }))
  const maxPnl = Math.max(1, ...bars.map(bar => Math.abs(bar.pnl)))

  function changeYear(value: number) {
    updateScope({ year: String(value), month: null })
  }

  return (
    <>
      <div className="pf-filters">
        <label>{text('year')}<select value={year} onChange={event => changeYear(Number(event.target.value))}>
          {PREVIEW_YEARS.map(value => <option key={value} value={value}>{value}</option>)}
        </select></label>
        <label>{text('account')}<select value={account} onChange={event => { updateScope({ account: event.target.value }) }}>
          <option value="all">{text('allAccounts')}</option><option value="A">{text('accountA')}</option><option value="B">{text('accountB')}</option>
        </select></label>
        <span className="pf-currency">{text('currency')} <strong>TWD</strong></span>
      </div>

      <section className="pf-summary" aria-label={text('realized')}>
        <div className="pf-summary-title"><span>{scope} <span className="pf-scope-month">{month === null ? text('allYear') : ''}</span></span>{year === 2026 && <span className="pf-badge">{text('yearToDate')}</span>}</div>
        <div className="pf-summary-grid">
          <div><p>{text('pnl')}</p><strong className={`pf-main-value ${summary.pnl < 0 ? 'pf-loss' : 'pf-gain'}`}>{formatSignedCurrency(summary.pnl, locale)} <small>TWD</small></strong></div>
          <dl><div><dt>{text('proceeds')}</dt><dd>{formatCurrency(summary.proceeds, locale)}</dd></div><div><dt>{text('cost')}</dt><dd>{formatCurrency(summary.cost, locale)}</dd></div><div><dt>{text('sellCount')}</dt><dd>{summary.count}</dd></div></dl>
        </div>
        <p className="pf-caption">{text('noReturn')}</p>
      </section>

      <section className="pf-panel">
        <div className="pf-panel-heading"><div><h2>{text(view === 'months' ? 'months' : 'actualYears')}</h2><p>{text(view === 'months' ? 'monthHelp' : 'compareHelp')}</p></div>
          <div className="pf-segment" role="group" aria-label={text('yearCompare')}>
            <button aria-pressed={view === 'months'} onClick={() => setView('months')}>{text('monthView')}</button>
            <button aria-pressed={view === 'years'} onClick={() => setView('years')}>{text('yearCompare')}</button>
          </div>
        </div>
        <div className="pf-chart-scroll"><div className={`pf-chart ${view === 'years' ? 'pf-year-chart' : ''}`}>
          {bars.map(bar => <button key={bar.value} className={`pf-chart-column ${bar.pnl < 0 ? 'pf-chart-loss' : ''}`} aria-pressed={view === 'months' ? month === bar.value : year === bar.value}
            aria-label={`${bar.label} ${text('pnl')} ${formatSignedCurrency(bar.pnl, locale)} TWD`}
            onClick={() => {
              if (view === 'years') { changeYear(bar.value); setView('months') }
              else { setMonth(month === bar.value ? null : bar.value) }
            }}>
            <span className="pf-chart-value">{formatSignedCurrency(bar.pnl, locale)}</span>
            <span className="pf-chart-positive"><span style={{ height: `${Math.max(0, bar.pnl) / maxPnl * 80}px` }} /></span>
            <span className="pf-chart-negative"><span style={{ height: `${Math.max(0, -bar.pnl) / maxPnl * 80}px` }} /></span>
            <span className="pf-chart-label">{bar.label}</span>
          </button>)}
        </div></div>
        <div className="pf-chart-footer"><span>{scope} · TWD</span>{month !== null && <button onClick={() => { setMonth(null); setSearch('') }}>{text('backYear')} ↗</button>}</div>
      </section>

      <section className="pf-panel">
        <div className="pf-panel-heading"><div><h2>{text('contributions')} <span className="pf-badge">{scope}</span></h2><p>{text('contributionHelp')}</p></div>
          <input type="search" aria-label={text('search')} placeholder={text('searchHint')} value={search} onChange={event => setSearch(event.target.value)} />
        </div>
        {sales.length === 0 ? <div className="pf-empty"><h3>{text('empty')}</h3><p>{text('emptyHelp')}</p><button onClick={() => setMonth(null)}>{text('backYear')} →</button></div>
          : filtered.length === 0 ? <p className="pf-empty">{text('noSearch')}</p>
            : <div className="pf-table-scroll"><table><thead><tr><th>{text('asset')}</th><th>{text('pnl')}</th><th>{text('proceeds')}</th><th>{text('cost')}</th><th>{text('sellCount')}</th><th><span className="sr-only">{text('details')}</span></th></tr></thead><tbody>
              {filtered.map(item => <tr key={item.symbol}>
                <td><button className="pf-asset-link" onClick={() => { setSelectedSymbol(item.symbol); dialog.current?.showModal() }}>{item.symbol}</button><small>{item.name}</small></td>
                <td className={item.pnl < 0 ? 'pf-loss' : 'pf-gain'}><strong>{formatSignedCurrency(item.pnl, locale)}</strong></td>
                <td>{formatCurrency(item.proceeds, locale)}</td><td>{formatCurrency(item.cost, locale)}</td><td>{item.count}</td>
                <td><button className="pf-detail-link" aria-label={text('viewDetails', { symbol: item.symbol })} onClick={() => { setSelectedSymbol(item.symbol); dialog.current?.showModal() }}>↗</button></td>
              </tr>)}
            </tbody></table></div>}
        <div className="pf-table-footer">{scope} · {account === 'all' ? text('allAccounts') : text(account === 'A' ? 'accountA' : 'accountB')} · TWD</div>
      </section>

      <details className="pf-method"><summary>{text('calc')}</summary><p>{text('calcText')}</p></details>
      <dialog ref={dialog} className="pf-dialog" aria-labelledby="pf-detail-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close() }}>
        <button autoFocus className="pf-close" aria-label={text('close')} onClick={() => dialog.current?.close()}>×</button>
        {selected && <><p className="pf-eyebrow">{text('demoDetails')}</p><h2 id="pf-detail-title">{selected.symbol} <span>{selected.name}</span></h2><p className="pf-caption">{scope} · {text('sellCount')} {selected.count}</p>
          <p className={`pf-detail-total ${selected.pnl < 0 ? 'pf-loss' : 'pf-gain'}`}>{formatSignedCurrency(selected.pnl, locale)} <small>TWD</small></p>
          <div className="pf-table-scroll"><table><thead><tr><th>{text('date')}</th><th>{text('account')}</th><th>{text('quantity')}</th><th>{text('proceeds')}</th><th>{text('cost')}</th><th>{text('pnl')}</th></tr></thead><tbody>
            {[...selected.trades].sort((a, b) => b.date.localeCompare(a.date)).map(sale => <tr key={sale.id}><td>{sale.date}</td><td>{text(sale.account === 'A' ? 'accountA' : 'accountB')}</td><td>{sale.quantity}</td><td>{formatCurrency(sale.proceeds, locale)}</td><td>{formatCurrency(sale.cost, locale)}</td><td className={sale.proceeds < sale.cost ? 'pf-loss' : 'pf-gain'}>{formatSignedCurrency(sale.proceeds - sale.cost, locale)}</td></tr>)}
          </tbody></table></div><p className="pf-caption pf-dialog-note">{text('noReturn')}</p></>}
      </dialog>
    </>
  )
}
