import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthenticatedUser } from '../app/use-auth'
import { useI18n } from '../i18n'
import { portfolioService } from '../lib/portfolio.service'
import { queryKeys, resolveDisplayCurrencyKey } from '../lib/query-keys'
import { formatCurrency, formatCurrencyWithCode, formatPercent, formatSignedCurrency, formatSnapshotDate } from '../lib/formatters'
import { marketPriceService } from '../lib/market-price.service'
import { getApiErrorMessage } from '../lib/errors'
import { usePreferencesStore } from '../store/preferences'
import { getHoldingLatestPriceCurrency } from '../components/dashboard/chart-helpers'
import './Overview.css'

const allocationColors = ['#367969', '#8cafa5', '#b1bfd1', '#b9a78e', '#a6a3bc']
const allocationColorById: Record<string, string> = {
  equity: '#367969',
  bond: '#8cafa5',
  etf: '#6f87a8',
  cash: '#b9a78e',
  crypto: '#a6a3bc',
  precious_metal: '#c4b07a',
}

type CopyText = (zh: string, en: string) => string

function allocationColor(id: string, index: number) {
  return allocationColorById[id] ?? allocationColors[index % allocationColors.length]
}

function allocationLabel(id: string, view: 'assetClass' | 'type', copy: CopyText) {
  if (view === 'assetClass') {
    switch (id) {
      case 'equity':
        return copy('股票類', 'Equities')
      case 'bond':
        return copy('債券類', 'Bonds')
      case 'cash':
        return copy('現金', 'Cash')
      case 'crypto':
        return copy('加密資產', 'Crypto')
      case 'precious_metal':
        return copy('貴金屬', 'Precious metals')
      default:
        return id
    }
  }

  switch (id) {
    case 'equity':
      return copy('個股', 'Individual stocks')
    case 'etf':
      return copy('ETF', 'ETFs')
    case 'crypto':
      return copy('加密貨幣', 'Crypto')
    case 'cash':
      return copy('現金', 'Cash')
    default:
      return id
  }
}

export default function Overview() {
  const userId = useAuthenticatedUser().id
  const { locale } = useI18n()
  const zh = locale === 'zh-TW'
  const copy = (cn: string, en: string) => zh ? cn : en
  const preferences = usePreferencesStore()
  const requestedCurrency = preferences.displayCurrencyMode === 'base' ? preferences.preferredBaseCurrency : undefined
  const currencyKey = resolveDisplayCurrencyKey(requestedCurrency)
  const params = requestedCurrency ? { preferredBaseCurrency: requestedCurrency } : undefined
  const client = useQueryClient()
  const [feedback, setFeedback] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const detailRef = useRef<HTMLDialogElement>(null)
  const summaryQuery = useQuery({ queryKey: queryKeys.portfolio.summary(userId, currencyKey), queryFn: () => portfolioService.getSummary(params) })
  const holdingsQuery = useQuery({ queryKey: queryKeys.portfolio.holdings(userId, currencyKey), queryFn: () => portfolioService.getHoldings(params) })
  const rebalanceQuery = useQuery({
    queryKey: queryKeys.portfolio.rebalance(userId, currencyKey, 80),
    queryFn: () => portfolioService.getRebalance({ ...params, targetEquity: 0.8, targetBond: 0.2 }),
  })
  const refresh = useMutation({
    mutationFn: () => marketPriceService.refreshPrices(),
    onMutate: () => setFeedback(''),
    onSuccess: async (result) => {
      if (result.status !== 'failed') await client.invalidateQueries({ queryKey: queryKeys.portfolio.all() })
      setFeedback(result.status === 'success'
        ? copy('價格已更新。', 'Prices updated.')
        : copy('部分或全部價格未能更新，請稍後重試。', 'Some or all prices could not be updated. Please retry later.'))
    },
    onError: (error) => setFeedback(getApiErrorMessage(error, copy('價格更新失敗，請稍後重試。', 'Price update failed. Please retry later.'))),
  })
  const summary = summaryQuery.data
  const currency = summary?.effectiveDisplayCurrency ?? summary?.baseCurrency
  const holdingsCurrency = holdingsQuery.data?.effectiveDisplayCurrency
  const holdings = holdingsQuery.data?.items ?? []
  const selected = holdings.find(item => item.assetId === selectedId)
  const classAllocations = (holdingsQuery.data?.allocationByAssetClass ?? []).map((item, index) => ({
    id: item.assetClass,
    label: allocationLabel(item.assetClass, 'assetClass', copy),
    weight: item.weight,
    color: allocationColor(item.assetClass, index),
  }))
  const typeAllocations = (holdingsQuery.data?.allocationByType ?? []).map((item, index) => ({
    id: item.type,
    label: allocationLabel(item.type, 'type', copy),
    weight: item.weight,
    color: allocationColor(item.type, index),
  }))
  const allocationView = preferences.allocationViewMode
  const allocations = allocationView === 'assetClass' ? classAllocations : typeAllocations
  const plan = rebalanceQuery.data
  const pnlClass = (value: number) => value > 0 ? 'ov-positive' : value < 0 ? 'ov-negative' : ''
  const money = (value: number) => formatCurrency(value, locale)
  const gap = plan ? (plan.targets.bond - plan.current.bond) * 100 : null

  return (
    <div className="overview">
      <header className="ov-header">
        <div><p className="ov-eyebrow">YOUR PORTFOLIO</p><h1>{copy('投資總覽', 'Portfolio overview')}</h1><p className="ov-muted">{copy('掌握現在，從容安排下一步。', 'A clear view of where you stand.')}</p></div>
        <Link className="ov-primary" to="/investments"><span aria-hidden="true">＋</span> {copy('記錄／匯入交易', 'Record / import trades')}</Link>
      </header>

      <section className="ov-summary" aria-label={copy('投資概況', 'Portfolio summary')}>
        <div className="ov-summary-top"><span>{copy('目前持倉', 'Current holdings')}</span><label>{copy('顯示幣別', 'Display currency')} <select aria-label={copy('顯示幣別', 'Display currency')} value={requestedCurrency ?? 'default'} onChange={event => {
          const value = event.target.value
          if (value === 'default') preferences.setDisplayCurrencyMode('original')
          else { preferences.setPreferredBaseCurrency(value as 'TWD' | 'USD'); preferences.setDisplayCurrencyMode('base') }
        }}><option value="default">{copy('投組預設', 'Portfolio default')}</option><option value="TWD">TWD</option><option value="USD">USD</option></select></label></div>
        {summaryQuery.isError && <p className="ov-error" role="alert">{copy('概況暫時無法更新，請重試。', 'Summary could not be refreshed.')} <button onClick={() => void summaryQuery.refetch()}>{copy('重試', 'Retry')}</button></p>}
        <div className="ov-metrics" aria-busy={summaryQuery.isLoading}>
          <div className="ov-value"><p>{copy('持倉總市值', 'Holdings market value')}</p><div className="ov-big-number">{summary ? money(summary.marketValue) : '—'} <span>{currency}</span></div><p className="ov-muted">{summary ? copy(`持有 ${summary.holdingsCount} 檔標的`, `${summary.holdingsCount} holdings`) : summaryQuery.isError ? copy('概況暫時無法取得', 'Summary unavailable') : copy('正在讀取投資概況…', 'Loading portfolio…')}</p></div>
          <div className="ov-metric"><p>{copy('未實現損益', 'Unrealized gain / loss')}</p><strong className={summary ? pnlClass(summary.totalPnl) : ''}>{summary ? formatSignedCurrency(summary.totalPnl, locale) : '—'}</strong><span className={`ov-return ${summary ? pnlClass(summary.totalReturnRate) : ''}`}>{summary ? formatPercent(summary.totalReturnRate) : '—'} <small>{copy('持倉報酬率', 'Return on holdings')}</small></span></div>
          <div className="ov-metric"><p>{copy('持倉成本', 'Holdings cost')}</p><strong>{summary ? money(summary.investedCapital) : '—'}</strong><span className="ov-muted">{copy('目前持有部位的成本', 'Cost of your open positions')}</span></div>
        </div>
        <div className="ov-summary-bottom"><span>{summary ? copy(`資料日期 ${formatSnapshotDate(summary.asOf, locale)}`, `As of ${formatSnapshotDate(summary.asOf, locale)}`) : '—'}<span className="ov-meta-divider">·</span>{copy('不含已實現損益與股利', 'Excludes realized gains and dividends')}</span><button className="ov-text-button" onClick={() => refresh.mutate()} disabled={refresh.isPending}>{refresh.isPending ? copy('更新中…', 'Updating…') : copy('↻ 更新價格', '↻ Update prices')}</button></div>
        {feedback && <p className="ov-feedback" role="status">{feedback}</p>}
      </section>

      <div className="ov-content">
        <section className="ov-panel ov-holdings">
          <div className="ov-section-heading"><div><h2>{copy('目前持倉', 'Your holdings')} <span className="ov-count">{holdingsQuery.data ? holdings.length : '—'}</span></h2><p className="ov-muted">{copy('資金放在哪裡，表現一眼掌握。', 'Where your money is, and how it is doing.')}</p></div><span className="ov-currency">{holdingsCurrency}</span></div>
          {holdingsQuery.isError ? <p className="ov-error" role="alert">{copy('持倉資料暫時無法更新。', 'Holdings could not be refreshed.')} <button onClick={() => void holdingsQuery.refetch()}>{copy('重試', 'Retry')}</button></p> : holdingsQuery.isLoading ? <p className="ov-empty" role="status">{copy('正在讀取持倉…', 'Loading holdings…')}</p> : holdings.length === 0 ? <div className="ov-empty"><h3>{copy('從第一筆投資開始', 'Start with your first investment')}</h3><p>{copy('記錄交易或匯入券商檔案後，就能在這裡查看持倉。', 'Record a trade or import a statement to see your holdings.')}</p><Link to="/investments">{copy('新增交易 →', 'Add a trade →')}</Link></div> : <div className="ov-table-scroll"><table><thead><tr><th>{copy('標的', 'Asset')}</th><th>{copy('市值／占比', 'Value / weight')}</th><th>{copy('未實現損益', 'Unrealized P&L')}</th><th><span className="sr-only">{copy('明細', 'Details')}</span></th></tr></thead><tbody>{holdings.map((holding, index) => <tr key={holding.assetId}>
            <td><div className="ov-asset"><span className="ov-asset-icon" style={{ background: allocationColors[index % allocationColors.length] }}>{holding.symbol.slice(0, 2)}</span><div><button className="ov-symbol" onClick={() => { setSelectedId(holding.assetId); detailRef.current?.showModal() }}>{holding.symbol}</button><span>{holding.name}</span></div></div></td>
            <td><strong>{money(holding.marketValue)}</strong><div className="ov-weight"><span className="ov-weight-track"><span style={{ width: `${Math.max(0, Math.min(100, holding.weight * 100))}%`, background: allocationColors[index % allocationColors.length] }} /></span><small>{formatPercent(holding.weight, { signed: false })}</small></div></td>
            <td className={pnlClass(holding.pnl)}><strong>{formatSignedCurrency(holding.pnl, locale)}</strong><small>{formatPercent(holding.returnRate)}</small></td>
            <td><button className="ov-detail-button" aria-label={copy(`查看 ${holding.symbol} 明細`, `View ${holding.symbol} details`)} onClick={() => { setSelectedId(holding.assetId); detailRef.current?.showModal() }}>↗</button></td>
          </tr>)}</tbody></table></div>}
          <div className="ov-panel-footer">{copy('點選標的，查看持有股數與成本明細。', 'Select a holding for quantity and cost details.')}</div>
        </section>

        <section className="ov-panel ov-allocation">
          <div className="ov-section-heading ov-allocation-heading">
            <div>
              <h2>{copy('配置狀況', 'Asset allocation')}</h2>
              <p className="ov-muted">{copy('依目前持倉市值計算', 'By current holdings market value')}</p>
            </div>
            <div className="ov-allocation-switch" role="group" aria-label={copy('配置分類方式', 'Allocation grouping')}>
              {([
                { value: 'assetClass', label: copy('資產類別', 'Asset class') },
                { value: 'type', label: copy('商品類型', 'Product type') },
              ] as const).map(option => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={allocationView === option.value}
                  onClick={() => preferences.setAllocationViewMode(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {holdingsQuery.isLoading ? (
            <p className="ov-allocation-status" role="status">{copy('讀取中…', 'Loading…')}</p>
          ) : holdingsQuery.isError ? (
            <p className="ov-error">{copy('配置資料暫時無法更新。', 'Allocation could not be refreshed.')}</p>
          ) : allocations.length ? (
            <>
              <div className="ov-allocation-bar" aria-hidden="true">
                {allocations.map(item => (
                  <span key={item.id} style={{ width: `${item.weight * 100}%`, background: item.color }} />
                ))}
              </div>
              <div className="ov-allocation-legend">
                {allocations.map(item => (
                  <div key={item.id}>
                    <span><i style={{ background: item.color }} />{item.label}</span>
                    <strong>{formatPercent(item.weight, { signed: false })}</strong>
                  </div>
                ))}
              </div>
              <p className="ov-allocation-note">
                {allocationView === 'assetClass'
                  ? copy('股票類包含股票型 ETF；債券類包含債券型 ETF。', 'Equities include equity ETFs; bonds include bond ETFs.')
                  : copy('ETF 獨立分類，不拆分底層資產。', 'ETFs are grouped separately, without looking through to underlying assets.')}
              </p>
            </>
          ) : (
            <p className="ov-allocation-note">{copy('此分類尚無配置資料', 'No allocation data for this grouping')}</p>
          )}
          {allocationView === 'assetClass' ? (
            <div className="ov-target">
              <p className="ov-eyebrow">{copy('股債配置參考 · 按資產類別', 'ALLOCATION CHECK · ASSET CLASS')}</p>
              <div className="ov-target-heading">
                <strong>{copy('80% 股票', '80% equity')}</strong>
                <span> / </span>
                <strong>{copy('20% 債券', '20% bonds')}</strong>
              </div>
              <p className="ov-muted">{copy('目前以 80／20 作為比較基準', 'Using an 80/20 reference target')}</p>
              {rebalanceQuery.isError ? (
                <p className="ov-error">{copy('暫時無法比較目標配置。', 'Target comparison is unavailable.')}</p>
              ) : rebalanceQuery.isLoading ? (
                <p role="status">{copy('正在比較配置…', 'Comparing allocation…')}</p>
              ) : plan && plan.trackedMarketValue > 0 && gap !== null ? (
                <div className="ov-insight">
                  <span aria-hidden="true">◉</span>
                  <p>
                    {Math.abs(gap) < 0.01
                      ? copy('目前股債比例已符合參考目標。', 'Your equity / bond mix matches the reference target.')
                      : gap > 0
                        ? copy(`債券比重低於參考目標 ${gap.toFixed(1)} 個百分點。`, `Bonds are ${gap.toFixed(1)} percentage points below the reference target.`)
                        : copy(`債券比重高於參考目標 ${Math.abs(gap).toFixed(1)} 個百分點。`, `Bonds are ${Math.abs(gap).toFixed(1)} percentage points above the reference target.`)}
                  </p>
                </div>
              ) : (
                <p className="ov-muted">{copy('持有股票或債券後即可比較。', 'Add equity or bond holdings to compare.')}</p>
              )}
            </div>
          ) : null}
        </section>
      </div>
      <Link className="ov-review-link" to="/performance"><span className="ov-review-icon" aria-hidden="true">↗</span><div><strong>{copy('回顧你的投資歷程', 'See the bigger picture')}</strong><p>{copy('年度已實現損益、每月買進與各標的歷史成果', 'Annual realized gains, monthly purchases and asset history')}</p></div><span className="ov-review-action">{copy('查看績效', 'Performance')} →</span></Link>
      <footer className="ov-footer"><span>TRACKVEST <span className="ov-meta-divider">/</span> {copy('讓每一筆投資更清楚', 'Clarity for every investment')}</span><Link to="/overview-previous">{copy('舊版首頁對照', 'Compare previous overview')} ↗</Link></footer>

      <dialog ref={detailRef} className="ov-dialog" onClick={event => { if (event.target === event.currentTarget) detailRef.current?.close() }} aria-labelledby="holding-detail-title">
        <button autoFocus className="ov-dialog-close" onClick={() => detailRef.current?.close()} aria-label={copy('關閉明細', 'Close details')}>×</button>
        {selected && <><p className="ov-eyebrow">{copy('持倉明細', 'HOLDING DETAILS')}</p><h2 id="holding-detail-title">{selected.symbol} <span>{selected.name}</span></h2><dl className="ov-detail-grid">
          <div><dt>{copy('持有數量', 'Quantity')}</dt><dd>{selected.quantity.toLocaleString(locale, { maximumFractionDigits: 8 })}</dd></div>
          <div><dt>{copy('占投組比重', 'Portfolio weight')}</dt><dd>{formatPercent(selected.weight, { signed: false })}</dd></div>
          <div><dt>{copy('平均成本', 'Average cost')}</dt><dd>{formatCurrencyWithCode(selected.avgCost, locale, holdingsCurrency)}</dd></div>
          <div><dt>{copy('最新報價', 'Latest price')}</dt><dd>{selected.latestPrice == null ? '—' : formatCurrencyWithCode(selected.latestPrice, locale, getHoldingLatestPriceCurrency(selected))}</dd></div>
          <div><dt>{copy('持倉市值', 'Market value')}</dt><dd>{formatCurrencyWithCode(selected.marketValue, locale, holdingsCurrency)}</dd></div>
          <div><dt>{copy('未實現損益', 'Unrealized P&L')}</dt><dd className={pnlClass(selected.pnl)}>{formatSignedCurrency(selected.pnl, locale, holdingsCurrency)}</dd></div>
        </dl><Link className="ov-text-button" to="/performance">{copy('查看歷史成果 →', 'View performance history →')}</Link></>}
      </dialog>
    </div>
  )
}
