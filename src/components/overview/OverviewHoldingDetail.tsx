import type { RefObject } from 'react'
import { Link } from 'react-router-dom'
import { getHoldingLatestPriceCurrency } from '../dashboard/chart-helpers'
import { useI18n } from '../../i18n'
import {
  formatCurrencyWithCode,
  formatPercent,
  formatSignedCurrency,
} from '../../lib/formatters'
import { signedToneClass } from '../../lib/overview-allocation'
import type { PortfolioHolding } from '../../lib/portfolio.service'

type OverviewHoldingDetailProps = {
  dialogRef: RefObject<HTMLDialogElement | null>
  holding: PortfolioHolding | undefined
  displayCurrency: string | null | undefined
}

export function OverviewHoldingDetail({
  dialogRef,
  holding,
  displayCurrency,
}: OverviewHoldingDetailProps) {
  const { locale, t } = useI18n()

  return (
    <dialog
      ref={dialogRef}
      className="ov-dialog"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          dialogRef.current?.close()
        }
      }}
      aria-labelledby="holding-detail-title"
    >
      <button
        type="button"
        autoFocus
        className="ov-dialog-close"
        onClick={() => dialogRef.current?.close()}
        aria-label={t('overview.closeDetails')}
      >
        ×
      </button>
      {holding ? (
        <>
          <p className="ov-eyebrow">{t('overview.holdingDetails')}</p>
          <h2 id="holding-detail-title">
            {holding.symbol} <span>{holding.name}</span>
          </h2>
          <dl className="ov-detail-grid">
            <div>
              <dt>{t('overview.quantity')}</dt>
              <dd>
                {holding.quantity.toLocaleString(locale, {
                  maximumFractionDigits: 8,
                })}
              </dd>
            </div>
            <div>
              <dt>{t('overview.portfolioWeight')}</dt>
              <dd>{formatPercent(holding.weight, { signed: false })}</dd>
            </div>
            <div>
              <dt>{t('overview.averageCost')}</dt>
              <dd>
                {formatCurrencyWithCode(
                  holding.avgCost,
                  locale,
                  displayCurrency,
                )}
              </dd>
            </div>
            <div>
              <dt>{t('overview.latestPrice')}</dt>
              <dd>
                {holding.latestPrice == null
                  ? '—'
                  : formatCurrencyWithCode(
                      holding.latestPrice,
                      locale,
                      getHoldingLatestPriceCurrency(holding),
                    )}
              </dd>
            </div>
            <div>
              <dt>{t('overview.holdingMarketValue')}</dt>
              <dd>
                {formatCurrencyWithCode(
                  holding.marketValue,
                  locale,
                  displayCurrency,
                )}
              </dd>
            </div>
            <div>
              <dt>{t('overview.holdingUnrealized')}</dt>
              <dd className={signedToneClass(holding.pnl)}>
                {formatSignedCurrency(holding.pnl, locale, displayCurrency)}
              </dd>
            </div>
          </dl>
          {/* 裸 /performance 會開已實現績效，不是標的歷史（PR #31） */}
          <Link className="ov-text-button" to="/performance?tab=history">
            {t('overview.viewHistory')}
          </Link>
        </>
      ) : null}
    </dialog>
  )
}
