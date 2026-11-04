import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useAuthenticatedUser } from '../../app/use-auth'
import { accountsService } from '../../lib/accounts.service'
import { yearInTimeZone } from '../../lib/annual-realized'
import { portfolioService } from '../../lib/portfolio.service'
import { queryKeys, resolveAccountScopeKey } from '../../lib/query-keys'
import { RealizedScopeResults } from './RealizedScopeResults'
import { RealizedChart, RealizedError } from './RealizedResultsShared'
import { useRealizedText } from './use-realized-text'

const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i
const CURRENCIES = ['TWD', 'USD', 'JPY', 'EUR']

export function LiveRealizedExplorer() {
  const user = useAuthenticatedUser()
  const { text } = useRealizedText()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<'months' | 'years'>('months')
  const accountId = params.get('accountId') || undefined
  const validAccount = accountId === undefined || UUID.test(accountId)
  const accounts = useQuery({ queryKey: queryKeys.accounts.all(user.id), queryFn: accountsService.getAccounts })
  const annual = useQuery({
    queryKey: queryKeys.portfolio.annualRealized(user.id, resolveAccountScopeKey(accountId)),
    queryFn: () => portfolioService.getAnnualRealized({ accountId }),
    enabled: validAccount,
  })
  const currentYear = yearInTimeZone(annual.data?.generatedAt ?? new Date().toISOString(), 'Asia/Taipei')!
  const requestedYear = Number(params.get('year'))
  const year = Number.isInteger(requestedYear) && requestedYear >= 1900 && requestedYear <= currentYear ? requestedYear : currentYear
  const periods = useQuery({
    queryKey: queryKeys.portfolio.realizedPeriods(user.id, { year, accountId }),
    queryFn: () => portfolioService.getRealizedPeriods({ year, accountId }),
    enabled: validAccount,
  })
  const groups = periods.data?.groups ?? []
  const requestedCurrency = params.get('currency') ?? ''
  const currency = CURRENCIES.includes(requestedCurrency) ? requestedCurrency : groups[0]?.currency
  const group = groups.find(item => item.currency === currency)
  const requestedMonth = Number(params.get('month'))
  const month = group?.months.some(item => item.month === requestedMonth) ? requestedMonth : undefined
  const years = [...new Set([currentYear, year, ...(annual.data?.items.map(item => item.year) ?? [])])]
    .filter(value => value >= 1900 && value <= currentYear).sort((a, b) => b - a)
  const accountName = accountId ? accounts.data?.find(item => item.id === accountId)?.name ?? text('selectedAccount') : text('allLiveAccounts')
  const scope = month === undefined ? text('yearScope', { year }) : text('monthScope', { year, month })
  function updateScope(values: Record<string, string | null>) {
    setParams(current => {
      const next = new URLSearchParams(current)
      for (const [key, value] of Object.entries(values)) {
        if (value === null) next.delete(key)
        else next.set(key, value)
      }
      return next
    })
  }
  function selectYear(value: number) {
    updateScope({ year: String(value), month: null })
    setView('months')
  }
  const chart = <section className="pf-panel">
    <div className="pf-panel-heading"><div><h2>{text(view === 'months' ? 'months' : 'actualYears')}</h2><p>{text(view === 'months' ? 'monthHelp' : 'compareHelp')}</p></div>
      <div className="pf-segment" role="group" aria-label={text('yearCompare')}>
        <button aria-pressed={view === 'months'} onClick={() => setView('months')}>{text('monthView')}</button>
        <button aria-pressed={view === 'years'} onClick={() => setView('years')}>{text('yearCompare')}</button>
      </div>
    </div>
    {view === 'years' && annual.isError ? <RealizedError retry={() => void annual.refetch()} />
      : view === 'years' && annual.isLoading ? <p className="pf-empty" role="status">{text('loading')}</p>
        : <RealizedChart years={view === 'years'} selected={view === 'months' ? month : year}
          bars={view === 'months' ? (group?.months ?? []).map(item => ({ value: item.month, label: text('month', { month: item.month }), pnl: item.realizedNetPnl, current: item.isCurrentMonth }))
            : (annual.data?.items ?? []).filter(item => item.currency === currency && item.year <= currentYear).sort((a, b) => a.year - b.year).map(item => ({ value: item.year, label: String(item.year), pnl: item.realizedNetPnl }))}
          onSelect={value => view === 'years' ? selectYear(value) : updateScope({ month: month === value ? null : String(value) })} />}
    <div className="pf-chart-footer"><span>{text(view === 'years' ? 'annualComparisonNote' : 'chartCurrency', { currency: currency ?? '' })}</span>{month !== undefined && <button onClick={() => updateScope({ month: null })}>{text('backYear')} ↗</button>}</div>
  </section>
  return <>
    <div className="pf-filters">
      <label>{text('year')}<select value={year} onChange={event => selectYear(Number(event.target.value))}>{years.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>{text('account')}<select value={accountId ?? ''} onChange={event => updateScope({ accountId: event.target.value || null, currency: null })}>
        <option value="">{text('allLiveAccounts')}</option>
        {accountId && !accounts.data?.some(item => item.id === accountId) && <option value={accountId}>{text('selectedAccount')}</option>}
        {accounts.data?.map(item => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}
      </select></label>
      {currency && <label>{text('currency')}<select value={currency} onChange={event => updateScope({ currency: event.target.value })}>
        {[...new Set([...groups.map(item => item.currency), currency])].map(value => <option key={value}>{value}</option>)}
      </select></label>}
    </div>
    {accounts.isError && <div className="pf-data-warning" role="alert">{text('accountsError')} <button onClick={() => void accounts.refetch()}>{text('retry')}</button></div>}
    {!validAccount ? <div className="pf-empty" role="alert">{text('invalidAccount')} <button onClick={() => updateScope({ accountId: null })}>{text('allLiveAccounts')}</button></div>
      : periods.isLoading ? <p className="pf-empty" role="status">{text('loadingPeriod')}</p>
        : periods.isError ? <RealizedError retry={() => void periods.refetch()} />
          : !group || !currency ? <p className="pf-empty">{text('noPeriodHistory')}</p>
            : <RealizedScopeResults key={`${year}:${month}:${currency}:${accountId}`} period={{ year, month, currency, accountId }}
              scope={scope} accountName={accountName} chart={chart} onFullYear={() => updateScope({ month: null })} />}
  </>
}
