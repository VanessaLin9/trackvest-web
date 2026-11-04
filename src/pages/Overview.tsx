import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { OverviewAllocation } from '../components/overview/OverviewAllocation'
import { OverviewHoldingDetail } from '../components/overview/OverviewHoldingDetail'
import { OverviewHoldings } from '../components/overview/OverviewHoldings'
import { OverviewSummary } from '../components/overview/OverviewSummary'
import { useOverviewPortfolio } from '../components/overview/use-overview-portfolio'
import { useI18n } from '../i18n'
import './Overview.css'

export default function Overview() {
  const { t } = useI18n()
  const portfolio = useOverviewPortfolio()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const detailRef = useRef<HTMLDialogElement>(null)
  const selected = portfolio.holdings.find(
    (holding) => holding.assetId === selectedId,
  )

  function openHolding(assetId: string) {
    setSelectedId(assetId)
    detailRef.current?.showModal()
  }

  return (
    <div className="overview">
      <header className="ov-header">
        <div>
          <p className="ov-eyebrow">{t('overview.eyebrow')}</p>
          <h1>{t('overview.title')}</h1>
          <p className="ov-muted">{t('overview.subtitle')}</p>
        </div>
        <Link className="ov-primary" to="/investments">
          <span aria-hidden="true">＋</span> {t('overview.recordTrades')}
        </Link>
      </header>

      <OverviewSummary
        requestedCurrency={portfolio.requestedCurrency}
        summaryQuery={portfolio.summaryQuery}
        refreshPrices={portfolio.refreshPrices}
        priceFeedback={portfolio.priceFeedback}
        summary={portfolio.summary}
        displayCurrency={portfolio.displayCurrency}
      />

      <div className="ov-content">
        <OverviewHoldings
          holdingsQuery={portfolio.holdingsQuery}
          holdings={portfolio.holdings}
          holdingsCurrency={portfolio.holdingsCurrency}
          onOpenHolding={openHolding}
        />
        <OverviewAllocation
          holdingsQuery={portfolio.holdingsQuery}
          rebalanceQuery={portfolio.rebalanceQuery}
        />
      </div>

      <Link className="ov-review-link" to="/performance">
        <span className="ov-review-icon" aria-hidden="true">
          ↗
        </span>
        <div>
          <strong>{t('overview.reviewTitle')}</strong>
          <p>{t('overview.reviewDescription')}</p>
        </div>
        <span className="ov-review-action">{t('overview.reviewAction')} →</span>
      </Link>

      <footer className="ov-footer">
        <span>
          TRACKVEST <span className="ov-meta-divider">/</span>{' '}
          {t('overview.footerTagline')}
        </span>
        <Link to="/overview-previous">{t('overview.previousOverview')} ↗</Link>
      </footer>

      <OverviewHoldingDetail
        dialogRef={detailRef}
        holding={selected}
        displayCurrency={portfolio.holdingsCurrency}
      />
    </div>
  )
}
