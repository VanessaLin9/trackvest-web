import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuthenticatedUser } from '../../app/use-auth'
import { useI18n } from '../../i18n'
import { annualCurrencies, annualRowsForCurrency, yearInTimeZone } from '../../lib/annual-realized'
import { formatExactDecimalAmount, formatSignedExactDecimalAmount, formatSnapshotDate } from '../../lib/formatters'
import { portfolioService } from '../../lib/portfolio.service'
import { queryKeys } from '../../lib/query-keys'

/** Annual API data only. No demo fallback and no inference of monthly/user P&L. */
export function LiveAnnualResults() {
  const user = useAuthenticatedUser()
  const { t, locale } = useI18n()
  const text = (key: string, values?: Record<string, string | number>) => t(`performancePoc.${key}`, values)
  const [selectedCurrency, setCurrency] = useState<string | null>(null)
  const [selectedYear, setYear] = useState<number | null>(null)
  const query = useQuery({
    queryKey: queryKeys.portfolio.annualRealized(user.id, 'all'),
    queryFn: () => portfolioService.getAnnualRealized(),
  })
  if (query.isLoading) return <p className="pf-empty" role="status">{text('loading')}</p>
  if (query.isError) return <div className="pf-empty" role="alert"><p>{text('error')}</p><button onClick={() => void query.refetch()}>{text('retry')}</button></div>
  const data = query.data
  const currencies = annualCurrencies(data?.items ?? [])
  const currency = currencies.includes(selectedCurrency ?? '') ? selectedCurrency! : currencies[0]
  const rows = currency ? annualRowsForCurrency(data?.items ?? [], currency) : []
  const selected = rows.find(row => row.year === selectedYear) ?? rows[0]
  if (!selected || !data) return <p className="pf-empty">{text('noData')}</p>
  const currentYear = yearInTimeZone(data.generatedAt, data.timeZone)
  const amount = (value: string | null) => formatExactDecimalAmount(value, locale) ?? text('unavailable')
  const signed = (value: string | null) => formatSignedExactDecimalAmount(value, locale) ?? text('unavailable')

  return <>
    <div className="pf-filters">
      <label>{text('year')}<select value={selected.year} onChange={event => setYear(Number(event.target.value))}>{rows.map(row => <option value={row.year} key={row.year}>{row.year}</option>)}</select></label>
      <label>{text('currency')}<select value={currency} onChange={event => { setCurrency(event.target.value); setYear(null) }}>{currencies.map(value => <option key={value}>{value}</option>)}</select></label>
    </div>
    <section className="pf-summary" aria-label={text('realized')}>
      <div className="pf-summary-title">{text('yearScope', { year: selected.year })}{selected.year === currentYear && <span className="pf-badge">{t('performance.annualYearToDate')}</span>}</div>
      <div className="pf-summary-grid"><div><p>{text('pnl')}</p><strong className={`pf-main-value ${selected.realizedNetPnl?.startsWith('-') ? 'pf-loss' : selected.realizedNetPnl === null ? '' : 'pf-gain'}`}>{signed(selected.realizedNetPnl)} <small>{currency}</small></strong></div>
        <dl><div><dt>{text('proceeds')}</dt><dd>{amount(selected.netProceeds)}</dd></div><div><dt>{text('cost')}</dt><dd>{amount(selected.disposedCost)}</dd></div><div><dt>{text('sellCount')}</dt><dd>{selected.sellCount}</dd></div></dl>
      </div><p className="pf-caption">{text('noReturn')} · {text('asOf', { date: formatSnapshotDate(data.generatedAt, locale) })}</p>
    </section>
    <section className="pf-panel"><div className="pf-panel-heading"><div><h2>{text('actualYears')}</h2><p>{text('actualHelp')}</p></div><span className="pf-badge">{currency}</span></div>
      <div className="pf-table-scroll"><table><thead><tr><th>{text('year')}</th><th>{text('pnl')}</th><th>{text('proceeds')}</th><th>{text('cost')}</th><th>{text('sellCount')}</th></tr></thead><tbody>{rows.map(row => <tr key={row.year} className={row.year === selected.year ? 'pf-selected-row' : ''}><td><button className="pf-asset-link" aria-pressed={row.year === selected.year} onClick={() => setYear(row.year)}>{row.year}</button></td><td className={row.realizedNetPnl?.startsWith('-') ? 'pf-loss' : ''}>{signed(row.realizedNetPnl)}</td><td>{amount(row.netProceeds)}</td><td>{amount(row.disposedCost)}</td><td>{row.sellCount}</td></tr>)}</tbody></table></div>
    </section>
  </>
}
