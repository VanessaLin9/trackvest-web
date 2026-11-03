import { useI18n } from '../../i18n'
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  formatSnapshotDate,
} from '../../lib/formatters'
import { signedToneClass } from '../../lib/overview-allocation'
import {
  PREFERRED_BASE_CURRENCIES,
  type PreferredBaseCurrency,
  usePreferencesStore,
} from '../../store/preferences'
import type { useOverviewPortfolio } from './use-overview-portfolio'

type OverviewSummaryProps = Pick<
  ReturnType<typeof useOverviewPortfolio>,
  | 'requestedCurrency'
  | 'summaryQuery'
  | 'refreshPrices'
  | 'priceFeedback'
  | 'summary'
  | 'displayCurrency'
>

function isPreferredBaseCurrency(
  value: string,
): value is PreferredBaseCurrency {
  return (PREFERRED_BASE_CURRENCIES as readonly string[]).includes(value)
}

export function OverviewSummary({
  requestedCurrency,
  summaryQuery,
  refreshPrices,
  priceFeedback,
  summary,
  displayCurrency,
}: OverviewSummaryProps) {
  const { locale, t } = useI18n()
  const setDisplayCurrencyMode = usePreferencesStore(
    (state) => state.setDisplayCurrencyMode,
  )
  const setPreferredBaseCurrency = usePreferencesStore(
    (state) => state.setPreferredBaseCurrency,
  )

  return (
    <section className="ov-summary" aria-label={t('overview.summaryLabel')}>
      <div className="ov-summary-top">
        <span>{t('overview.currentHoldings')}</span>
        <label>
          {t('overview.displayCurrency')}{' '}
          <select
            aria-label={t('overview.displayCurrency')}
            value={requestedCurrency ?? 'default'}
            onChange={(event) => {
              const value = event.target.value
              if (value === 'default') {
                setDisplayCurrencyMode('original')
                return
              }
              if (!isPreferredBaseCurrency(value)) {
                return
              }
              setPreferredBaseCurrency(value)
              setDisplayCurrencyMode('base')
            }}
          >
            <option value="default">{t('overview.portfolioDefault')}</option>
            {PREFERRED_BASE_CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
      </div>

      {summaryQuery.isError ? (
        <p className="ov-error" role="alert">
          {t('overview.summaryError')}{' '}
          <button type="button" onClick={() => void summaryQuery.refetch()}>
            {t('overview.retry')}
          </button>
        </p>
      ) : null}

      <div className="ov-metrics" aria-busy={summaryQuery.isLoading}>
        <div className="ov-value">
          <p>{t('overview.marketValue')}</p>
          <div className="ov-big-number">
            {summary ? formatCurrency(summary.marketValue, locale) : '—'}{' '}
            <span>{displayCurrency}</span>
          </div>
          <p className="ov-muted">
            {summary
              ? t('overview.holdingsCount', { count: summary.holdingsCount })
              : summaryQuery.isError
                ? t('overview.summaryUnavailable')
                : t('overview.summaryLoading')}
          </p>
        </div>
        <div className="ov-metric">
          <p>{t('overview.unrealizedPnl')}</p>
          <strong className={summary ? signedToneClass(summary.totalPnl) : ''}>
            {summary ? formatSignedCurrency(summary.totalPnl, locale) : '—'}
          </strong>
          <span
            className={`ov-return ${summary ? signedToneClass(summary.totalReturnRate) : ''}`}
          >
            {summary ? formatPercent(summary.totalReturnRate) : '—'}{' '}
            <small>{t('overview.holdingsReturn')}</small>
          </span>
        </div>
        <div className="ov-metric">
          <p>{t('overview.holdingsCost')}</p>
          <strong>
            {summary ? formatCurrency(summary.investedCapital, locale) : '—'}
          </strong>
          <span className="ov-muted">{t('overview.holdingsCostHint')}</span>
        </div>
      </div>

      <div className="ov-summary-bottom">
        <span>
          {summary
            ? t('overview.asOf', {
                date: formatSnapshotDate(summary.asOf, locale),
              })
            : '—'}
          <span className="ov-meta-divider">·</span>
          {t('overview.excludesRealized')}
        </span>
        <button
          type="button"
          className="ov-text-button"
          onClick={() => refreshPrices.mutate()}
          disabled={refreshPrices.isPending}
        >
          {refreshPrices.isPending
            ? t('overview.updatingPrices')
            : t('overview.updatePrices')}
        </button>
      </div>
      {priceFeedback ? (
        <p className="ov-feedback" role="status">
          {priceFeedback}
        </p>
      ) : null}
    </section>
  )
}
