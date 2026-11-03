import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
} from '../../lib/formatters'
import {
  allocationBarPercent,
  overviewHoldingColor,
  signedToneClass,
} from '../../lib/overview-allocation'
import type { PortfolioHolding } from '../../lib/portfolio.service'
import type { useOverviewPortfolio } from './use-overview-portfolio'

type OverviewHoldingsProps = Pick<
  ReturnType<typeof useOverviewPortfolio>,
  'holdingsQuery' | 'holdings' | 'holdingsCurrency'
> & {
  onOpenHolding: (assetId: string) => void
}

export function OverviewHoldings({
  holdingsQuery,
  holdings,
  holdingsCurrency,
  onOpenHolding,
}: OverviewHoldingsProps) {
  const { locale, t } = useI18n()

  return (
    <section className="ov-panel ov-holdings">
      <div className="ov-section-heading">
        <div>
          <h2>
            {t('overview.holdingsTitle')}{' '}
            <span className="ov-count">
              {holdingsQuery.data ? holdings.length : '—'}
            </span>
          </h2>
          <p className="ov-muted">{t('overview.holdingsDescription')}</p>
        </div>
        <span className="ov-currency">{holdingsCurrency}</span>
      </div>

      {holdingsQuery.isError ? (
        <p className="ov-error" role="alert">
          {t('overview.holdingsError')}{' '}
          <button type="button" onClick={() => void holdingsQuery.refetch()}>
            {t('overview.retry')}
          </button>
        </p>
      ) : holdingsQuery.isLoading ? (
        <p className="ov-empty" role="status">
          {t('overview.holdingsLoading')}
        </p>
      ) : holdings.length === 0 ? (
        <div className="ov-empty">
          <h3>{t('overview.emptyTitle')}</h3>
          <p>{t('overview.emptyDescription')}</p>
          <Link to="/investments">{t('overview.addTrade')}</Link>
        </div>
      ) : (
        <HoldingsTable
          holdings={holdings}
          locale={locale}
          onOpenHolding={onOpenHolding}
          viewDetailsLabel={(symbol) => t('overview.viewDetails', { symbol })}
        />
      )}

      <div className="ov-panel-footer">{t('overview.holdingsFooter')}</div>
    </section>
  )
}

function HoldingsTable({
  holdings,
  locale,
  onOpenHolding,
  viewDetailsLabel,
}: {
  holdings: PortfolioHolding[]
  locale: string
  onOpenHolding: (assetId: string) => void
  viewDetailsLabel: (symbol: string) => string
}) {
  const { t } = useI18n()

  return (
    <div className="ov-table-scroll">
      <table>
        <thead>
          <tr>
            <th>{t('overview.columnAsset')}</th>
            <th>{t('overview.columnValueWeight')}</th>
            <th>{t('overview.columnUnrealized')}</th>
            <th>
              <span className="sr-only">{t('overview.columnDetails')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding, index) => {
            const color = overviewHoldingColor(index)
            return (
              <tr key={holding.assetId}>
                <td>
                  <div className="ov-asset">
                    <span className="ov-asset-icon" style={{ background: color }}>
                      {holding.symbol.slice(0, 2)}
                    </span>
                    <div>
                      <button
                        type="button"
                        className="ov-symbol"
                        onClick={() => onOpenHolding(holding.assetId)}
                      >
                        {holding.symbol}
                      </button>
                      <span>{holding.name}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <strong>{formatCurrency(holding.marketValue, locale)}</strong>
                  <div className="ov-weight">
                    <span className="ov-weight-track">
                      <span
                        style={{
                          width: `${allocationBarPercent(holding.weight)}%`,
                          background: color,
                        }}
                      />
                    </span>
                    <small>
                      {formatPercent(holding.weight, { signed: false })}
                    </small>
                  </div>
                </td>
                <td className={signedToneClass(holding.pnl)}>
                  <strong>{formatSignedCurrency(holding.pnl, locale)}</strong>
                  <small>{formatPercent(holding.returnRate)}</small>
                </td>
                <td>
                  <button
                    type="button"
                    className="ov-detail-button"
                    aria-label={viewDetailsLabel(holding.symbol)}
                    onClick={() => onOpenHolding(holding.assetId)}
                  >
                    ↗
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
