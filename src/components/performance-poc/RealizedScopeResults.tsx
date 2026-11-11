import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthenticatedUser } from '../../app/use-auth'
import { portfolioService } from '../../lib/portfolio.service'
import { queryKeys } from '../../lib/query-keys'
import { REALIZED_PAGE_SIZE, type RealizedAsset, type RealizedAssetsQuery } from '../../lib/realized-performance'
import { RealizedTradeDetails } from './RealizedTradeDetails'
import { RealizedError, RealizedPages, RealizedSummaryCard } from './RealizedResultsShared'
import { pnlClass, useRealizedText } from './use-realized-text'

/** Remounted for each period/currency/account so pages and open details cannot leak scope. */
export function RealizedScopeResults({ period, scope, accountName, chart, onFullYear }: {
  period: RealizedAssetsQuery; scope: string; accountName: string; chart: ReactNode; onFullYear: () => void
}) {
  const user = useAuthenticatedUser()
  const { text, amount, signed } = useRealizedText()
  const [skip, setSkip] = useState(0)
  const [asset, setAsset] = useState<RealizedAsset | null>(null)
  const params = { ...period, skip, take: REALIZED_PAGE_SIZE }
  const query = useQuery({
    queryKey: queryKeys.portfolio.realizedAssets(user.id, params),
    queryFn: () => portfolioService.getRealizedAssets(params),
  })
  const data = query.isError ? undefined : query.data
  return <>
    {query.isLoading ? <p className="pf-empty" role="status">{text('loadingPeriod')}</p>
      : query.isError ? <RealizedError retry={() => void query.refetch()} />
        : data && <RealizedSummaryCard summary={data.summary} scope={scope} currency={period.currency} generatedAt={data.generatedAt} asOf={data.asOf} />}
    {chart}
    {data && <section className="pf-panel">
      <div className="pf-panel-heading"><div><h2>{text('contributions')} <span className="pf-badge">{scope}</span></h2><p>{text('contributionHelp')}</p></div><span className="pf-badge">{period.currency}</span></div>
      {data.total === 0 ? <div className="pf-empty"><h3>{text('empty')}</h3><p>{text('emptyHelp')}</p>{period.month !== undefined && <button onClick={onFullYear}>{text('backYear')} →</button>}</div>
        : <div className="pf-table-scroll"><table aria-label={text('contributions')}><thead><tr>
          <th>{text('asset')}</th><th>{text('pnl')}</th><th>{text('proceeds')}</th><th>{text('cost')}</th><th>{text('sellCount')}</th><th><span className="sr-only">{text('details')}</span></th>
        </tr></thead><tbody>{data.items.map(item => <tr key={item.assetId}>
          <td><button className="pf-asset-link" onClick={() => setAsset(item)}>{item.symbol}</button><small>{item.name}</small></td>
          <td className={pnlClass(item.realizedNetPnl)}><strong>{signed(item.realizedNetPnl)}</strong></td>
          <td>{amount(item.netProceeds)}</td><td>{amount(item.disposedCost)}</td><td>{item.sellCount}</td>
          <td><button className="pf-detail-link" aria-label={text('viewDetails', { symbol: item.symbol })} onClick={() => setAsset(item)}>↗</button></td>
        </tr>)}</tbody></table></div>}
      <RealizedPages skip={data.skip} take={data.take} total={data.total} onPage={setSkip} kind="assets" />
      <div className="pf-table-footer">{scope} · {accountName} · {period.currency}</div>
    </section>}
    <details className="pf-method"><summary>{text('calc')}</summary><p>{text('liveCalcText')}</p></details>
    {asset && <RealizedTradeDetails asset={asset} period={period} scope={scope} onClose={() => setAsset(null)} />}
  </>
}
