import { useI18n } from '../../i18n'
import { getApiErrorMessage } from '../../lib/errors'
import {
  formatCurrencyWithCode,
  formatPercent,
  formatPercentPoints,
} from '../../lib/formatters'
import { chartColors } from '../../theme/chart-tokens'
import { ApplyIcon, LockIcon } from './icons'
import { RebalancePriceCell } from './rebalance/RebalancePriceCell'
import { useRebalancePlan } from './rebalance/useRebalancePlan'

interface RebalancePanelProps {
  currentUserId: string
  displayCurrency: string | null
  requestedDisplayCurrency: string | undefined
}

/**
 * Asset-class rebalance widget: shows a concentric donut comparing the
 * current vs target allocation, an optional slider to tweak the target
 * split, and a table of per-holding buy suggestions with editable
 * quantities. All server fetching + derived state lives inside
 * `useRebalancePlan` so this component is a straight presentation layer.
 */
export function RebalancePanel({
  currentUserId,
  displayCurrency,
  requestedDisplayCurrency,
}: RebalancePanelProps) {
  const { t, locale } = useI18n()
  const {
    isLoading,
    error,
    rebalancePlan,
    displayedSuggestions,
    draftPreview,
    draftEquityPercent,
    draftBondPercent,
    isTargetUnlocked,
    hoverLabel,
    quantityDrafts,
    setDraftEquityPercent,
    setHoverLabel,
    onTargetLockToggle,
    onQuantityChange,
  } = useRebalancePlan({
    currentUserId,
    displayCurrency,
    requestedDisplayCurrency,
  })

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
          {t('dashboard.rebalanceEyebrow')}
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">
          {t('dashboard.rebalanceTitle')}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          {t('dashboard.rebalanceDescription')}
        </p>
      </div>

      {isLoading ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-600">
          {t('dashboard.loading')}
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-700">
          {getApiErrorMessage(error, t('dashboard.failedToLoad'))}
        </div>
      ) : rebalancePlan ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-center">
              <div className="relative flex h-64 w-64 items-center justify-center">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 220 220"
                  className="absolute inset-0 h-full w-full -rotate-90"
                >
                  <circle
                    cx="110"
                    cy="110"
                    r="94"
                    fill="none"
                    stroke={chartColors.equity}
                    strokeWidth="30"
                    strokeDasharray={`${rebalancePlan.current.equity * 100} ${100 - rebalancePlan.current.equity * 100}`}
                    pathLength="100"
                    className="cursor-help"
                    onMouseEnter={() =>
                      setHoverLabel(
                        `${t('dashboard.rebalanceCurrentLabel')} ${t('dashboard.assetClassEquity')} ${formatPercent(rebalancePlan.current.equity, {
                          signed: false,
                        })}`,
                      )
                    }
                    onMouseLeave={() => setHoverLabel(null)}
                  >
                    <title>
                      {`${t('dashboard.rebalanceCurrentLabel')} ${t('dashboard.assetClassEquity')} ${formatPercent(rebalancePlan.current.equity, {
                        signed: false,
                      })}`}
                    </title>
                  </circle>
                  <circle
                    cx="110"
                    cy="110"
                    r="94"
                    fill="none"
                    stroke={chartColors.bond}
                    strokeWidth="30"
                    strokeDasharray={`${(1 - rebalancePlan.current.equity) * 100} ${rebalancePlan.current.equity * 100}`}
                    strokeDashoffset={-rebalancePlan.current.equity * 100}
                    pathLength="100"
                    className="cursor-help"
                    onMouseEnter={() =>
                      setHoverLabel(
                        `${t('dashboard.rebalanceCurrentLabel')} ${t('dashboard.assetClassBond')} ${formatPercent(rebalancePlan.current.bond, {
                          signed: false,
                        })}`,
                      )
                    }
                    onMouseLeave={() => setHoverLabel(null)}
                  >
                    <title>
                      {`${t('dashboard.rebalanceCurrentLabel')} ${t('dashboard.assetClassBond')} ${formatPercent(rebalancePlan.current.bond, {
                        signed: false,
                      })}`}
                    </title>
                  </circle>
                  <circle
                    cx="110"
                    cy="110"
                    r="62"
                    fill="none"
                    stroke={chartColors.rebalanceTargetEquity}
                    strokeWidth="26"
                    strokeDasharray={`${rebalancePlan.targets.equity * 100} ${100 - rebalancePlan.targets.equity * 100}`}
                    pathLength="100"
                    className="cursor-help"
                    onMouseEnter={() =>
                      setHoverLabel(
                        `${t('dashboard.rebalanceTargetLabel')} ${t('dashboard.assetClassEquity')} ${formatPercent(rebalancePlan.targets.equity, {
                          signed: false,
                        })}`,
                      )
                    }
                    onMouseLeave={() => setHoverLabel(null)}
                  >
                    <title>
                      {`${t('dashboard.rebalanceTargetLabel')} ${t('dashboard.assetClassEquity')} ${formatPercent(rebalancePlan.targets.equity, {
                        signed: false,
                      })}`}
                    </title>
                  </circle>
                  <circle
                    cx="110"
                    cy="110"
                    r="62"
                    fill="none"
                    stroke={chartColors.rebalanceTargetBond}
                    strokeWidth="26"
                    strokeDasharray={`${(1 - rebalancePlan.targets.equity) * 100} ${rebalancePlan.targets.equity * 100}`}
                    strokeDashoffset={-rebalancePlan.targets.equity * 100}
                    pathLength="100"
                    className="cursor-help"
                    onMouseEnter={() =>
                      setHoverLabel(
                        `${t('dashboard.rebalanceTargetLabel')} ${t('dashboard.assetClassBond')} ${formatPercent(rebalancePlan.targets.bond, {
                          signed: false,
                        })}`,
                      )
                    }
                    onMouseLeave={() => setHoverLabel(null)}
                  >
                    <title>
                      {`${t('dashboard.rebalanceTargetLabel')} ${t('dashboard.assetClassBond')} ${formatPercent(rebalancePlan.targets.bond, {
                        signed: false,
                      })}`}
                    </title>
                  </circle>
                </svg>
                <div className="relative z-10 text-center">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                    {t('dashboard.rebalanceGapLabel')}
                  </p>
                  <p
                    className={`mt-2 text-3xl font-semibold ${
                      rebalancePlan.gaps.equity >= 0
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {formatPercentPoints(rebalancePlan.gaps.equity)}
                  </p>
                </div>
              </div>
            </div>
            {hoverLabel ? (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                {hoverLabel}
              </div>
            ) : null}

            <div className="mt-5 flex items-stretch gap-3">
              <div
                className={`h-20 overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-all duration-300 ${
                  isTargetUnlocked
                    ? 'pointer-events-none max-w-0 flex-[0_0_0%] -translate-x-2 opacity-0'
                    : 'flex-1 opacity-100'
                }`}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                  {t('dashboard.rebalanceCurrentLabel')}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {`${formatPercent(rebalancePlan.current.equity, { signed: false })} ${t('dashboard.assetClassEquity')} / ${formatPercent(rebalancePlan.current.bond, { signed: false })} ${t('dashboard.assetClassBond')}`}
                </p>
              </div>

              <div className="relative h-20 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      {t('dashboard.rebalanceTargetLabel')}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {`${draftEquityPercent}% ${t('dashboard.assetClassEquity')} / ${draftBondPercent}% ${t('dashboard.assetClassBond')}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onTargetLockToggle}
                    aria-label={
                      isTargetUnlocked
                        ? t('dashboard.rebalanceLockApplyLabel')
                        : t('dashboard.rebalanceLockEditLabel')
                    }
                    title={
                      isTargetUnlocked
                        ? t('dashboard.rebalanceLockApplyLabel')
                        : t('dashboard.rebalanceLockEditLabel')
                    }
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
                      isTargetUnlocked
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isTargetUnlocked ? <ApplyIcon /> : <LockIcon />}
                  </button>
                </div>

                <div
                  className={`absolute inset-x-4 bottom-3 overflow-hidden transition-all duration-300 ${
                    isTargetUnlocked
                      ? 'max-h-16 translate-x-0 opacity-100'
                      : 'max-h-0 translate-x-4 opacity-0'
                  }`}
                >
                  <label htmlFor="rebalance-target-equity" className="sr-only">
                    {t('dashboard.rebalanceTargetEquityLabel')}
                  </label>
                  <input
                    id="rebalance-target-equity"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={draftEquityPercent}
                    onChange={(event) =>
                      setDraftEquityPercent(Number(event.target.value))
                    }
                    disabled={!isTargetUnlocked}
                    className={`h-3 w-full appearance-none rounded-full bg-transparent accent-slate-900 ${
                      isTargetUnlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                    }`}
                    style={{
                      background: `linear-gradient(to right, ${chartColors.equity} 0%, ${chartColors.equity} ${draftEquityPercent}%, ${chartColors.bond} ${draftEquityPercent}%, ${chartColors.bond} 100%)`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Estimated top-up */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {t('dashboard.rebalanceActionTitle')}
            </p>
            {rebalancePlan.totalRecommendedBuyAmount > 0 ? (
              <>
                <p className="mt-3 text-2xl font-semibold text-slate-900">
                  {formatCurrencyWithCode(
                    rebalancePlan.totalRecommendedBuyAmount,
                    locale,
                    displayCurrency,
                  )}
                </p>
                {/* <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t('dashboard.rebalanceActionDescription', {
                    amount: formatCurrencyWithCode(
                      rebalancePlan.totalRecommendedBuyAmount,
                      locale,
                      displayCurrency,
                    ),
                  })}
                </p> */}
                {rebalancePlan.notes.length ? (
                  <details className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <summary className="cursor-pointer list-none text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                      {t('dashboard.rebalanceFootnoteLabel')}
                    </summary>
                    <div className="mt-3 space-y-1 text-sm leading-6 text-slate-600">
                      {rebalancePlan.notes.map((note) => (
                        <p key={note}>{note}</p>
                      ))}
                    </div>
                  </details>
                ) : null}
                {displayedSuggestions.length ? (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-slate-200 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      <p>{t('dashboard.rebalanceSuggestionAsset')}</p>
                      <p>{t('dashboard.rebalanceSuggestionPriceLabel')}</p>
                      <p>{t('dashboard.rebalanceSuggestionQuantityLabel')}</p>
                      <p>{t('dashboard.rebalanceSuggestionAmountLabel')}</p>
                    </div>
                    <div className="divide-y divide-slate-200">
                      {displayedSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.assetId}
                          className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {suggestion.symbol}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {suggestion.name}
                            </p>
                          </div>
                          <RebalancePriceCell suggestion={suggestion} />
                          <div>
                            <label
                              htmlFor={`rebalance-quantity-${suggestion.assetId}`}
                              className="sr-only"
                            >
                              {t('dashboard.rebalanceSuggestionQuantityInputLabel', {
                                symbol: suggestion.symbol,
                              })}
                            </label>
                            <input
                              id={`rebalance-quantity-${suggestion.assetId}`}
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              value={
                                quantityDrafts[suggestion.assetId] ??
                                suggestion.quantity.toFixed(2)
                              }
                              onChange={(event) =>
                                onQuantityChange(
                                  suggestion.assetId,
                                  event.target.value,
                                )
                              }
                              disabled={suggestion.displayPrice == null}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </div>
                          <p className="text-sm font-medium text-slate-900">
                            {formatCurrencyWithCode(
                              suggestion.amount,
                              locale,
                              displayCurrency,
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {draftPreview ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                      {t('dashboard.rebalanceDraftSummaryLabel')}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
                      <p>
                        {t('dashboard.rebalanceDraftSummaryTotal', {
                          amount: formatCurrencyWithCode(
                            draftPreview.totalAdded,
                            locale,
                            displayCurrency,
                          ),
                        })}
                      </p>
                      <p>
                        {t('dashboard.rebalanceDraftSummaryMix', {
                          equity: formatPercent(draftPreview.projectedEquity, {
                            signed: false,
                          }),
                          bond: formatPercent(draftPreview.projectedBond, {
                            signed: false,
                          }),
                        })}
                      </p>
                      <p>
                        {t('dashboard.rebalanceDraftSummaryShift', {
                          shift: formatPercentPoints(draftPreview.equityShift),
                        })}
                      </p>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {t('dashboard.rebalanceNoActionNeeded')}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-600">
          {t('dashboard.rebalanceEmptyState')}
        </div>
      )}
    </section>
  )
}
