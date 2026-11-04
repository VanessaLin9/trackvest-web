import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthenticatedUser } from '../../app/use-auth'
import { formatSnapshotDate } from '../../lib/formatters'
import { portfolioService } from '../../lib/portfolio.service'
import { queryKeys } from '../../lib/query-keys'
import { REALIZED_PAGE_SIZE, type RealizedAsset, type RealizedAssetsQuery } from '../../lib/realized-performance'
import { RealizedError, RealizedPages } from './RealizedResultsShared'
import { pnlClass, useRealizedText } from './use-realized-text'

export function RealizedTradeDetails({ asset, period, scope, onClose }: {
  asset: RealizedAsset; period: RealizedAssetsQuery; scope: string; onClose: () => void
}) {
  const user = useAuthenticatedUser()
  const { text, locale, amount, signed } = useRealizedText()
  const dialog = useRef<HTMLDialogElement>(null)
  const [skip, setSkip] = useState(0)
  const params = { ...period, assetId: asset.assetId, skip, take: REALIZED_PAGE_SIZE }
  const query = useQuery({
    queryKey: queryKeys.portfolio.realizedTrades(user.id, params),
    queryFn: () => portfolioService.getRealizedTrades(params),
  })
  useEffect(() => { dialog.current?.showModal() }, [])
  const data = query.data
  return <dialog ref={dialog} className="pf-dialog" aria-labelledby="pf-live-detail-title" onClose={onClose}
    onClick={event => { if (event.target === event.currentTarget) dialog.current?.close() }}>
    <button autoFocus className="pf-close" aria-label={text('close')} onClick={() => dialog.current?.close()}>×</button>
    <p className="pf-eyebrow">{text('liveDetails')} · {period.currency}</p>
    <h2 id="pf-live-detail-title">{asset.symbol} <span>{asset.name}</span></h2>
    <p className="pf-caption">{scope}</p>
    {query.isLoading ? <p className="pf-empty" role="status">{text('loadingTrades')}</p>
      : query.isError ? <RealizedError retry={() => void query.refetch()} />
        : data && <>
          <p className={`pf-detail-total ${pnlClass(data.summary.realizedNetPnl)}`}>{signed(data.summary.realizedNetPnl)} <small>{period.currency}</small></p>
          <p className="pf-caption pf-dialog-note">{text('fullTradeSummary', { count: data.summary.sellCount })} · {text('asOf', { date: formatSnapshotDate(data.generatedAt, locale) })}</p>
          {data.summary.issues.includes('MISSING_FIFO') && <p className="pf-data-warning">{text('missingFifo')}</p>}
          {data.total === 0 ? <p className="pf-empty">{text('empty')}</p>
            : <div className="pf-table-scroll"><table aria-label={text('details')}><thead><tr>
              <th>{text('date')}</th><th>{text('account')}</th><th>{text('quantity')}</th>
              <th>{text('proceeds')}</th><th>{text('cost')}</th><th>{text('pnl')}</th>
            </tr></thead><tbody>{data.items.map(sale => <tr key={sale.transactionId}>
              <td>{new Intl.DateTimeFormat(locale, { timeZone: data.timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(sale.tradeTime))}</td>
              <td>{sale.accountName}</td><td>{amount(sale.quantity)}</td><td>{amount(sale.amount)}</td>
              <td>{amount(sale.disposedCost)}</td><td className={pnlClass(sale.realizedNetPnl)}>{signed(sale.realizedNetPnl)}</td>
            </tr>)}</tbody></table></div>}
          <RealizedPages skip={data.skip} take={data.take} total={data.total} onPage={setSkip} kind="trades" />
          <p className="pf-caption pf-dialog-note">{text('tradeNote')}</p>
        </>}
  </dialog>
}
