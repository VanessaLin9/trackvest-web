import { useI18n } from '../../i18n'
import { formatPercent } from '../../lib/formatters'
import {
  bondGapInsight,
  mapClassAllocations,
  mapTypeAllocations,
} from '../../lib/overview-allocation'
import {
  ALLOCATION_VIEW_MODES,
  usePreferencesStore,
  type AllocationViewMode,
} from '../../store/preferences'
import type { useOverviewPortfolio } from './use-overview-portfolio'

type OverviewAllocationProps = Pick<
  ReturnType<typeof useOverviewPortfolio>,
  'holdingsQuery' | 'rebalanceQuery'
>

export function OverviewAllocation({
  holdingsQuery,
  rebalanceQuery,
}: OverviewAllocationProps) {
  const { t } = useI18n()
  const allocationView = usePreferencesStore((state) => state.allocationViewMode)
  const setAllocationViewMode = usePreferencesStore(
    (state) => state.setAllocationViewMode,
  )
  const allocations =
    allocationView === 'assetClass'
      ? mapClassAllocations(holdingsQuery.data?.allocationByAssetClass ?? [], t)
      : mapTypeAllocations(holdingsQuery.data?.allocationByType ?? [], t)
  const plan = rebalanceQuery.data
  const gap = plan ? (plan.targets.bond - plan.current.bond) * 100 : null

  return (
    <section className="ov-panel ov-allocation">
      <div className="ov-section-heading ov-allocation-heading">
        <div>
          <h2>{t('overview.allocationTitle')}</h2>
          <p className="ov-muted">{t('overview.allocationDescription')}</p>
        </div>
        <div
          className="ov-allocation-switch"
          role="group"
          aria-label={t('overview.allocationGrouping')}
        >
          {ALLOCATION_VIEW_MODES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={allocationView === value}
              onClick={() => setAllocationViewMode(value)}
            >
              {allocationViewLabel(value, t)}
            </button>
          ))}
        </div>
      </div>

      {holdingsQuery.isLoading ? (
        <p className="ov-allocation-status" role="status">
          {t('overview.allocationLoading')}
        </p>
      ) : holdingsQuery.isError ? (
        <p className="ov-error">{t('overview.allocationError')}</p>
      ) : allocations.length ? (
        <>
          <div className="ov-allocation-bar" aria-hidden="true">
            {allocations.map((item) => (
              <span
                key={item.id}
                style={{
                  width: `${item.weight * 100}%`,
                  background: item.color,
                }}
              />
            ))}
          </div>
          <div className="ov-allocation-legend">
            {allocations.map((item) => (
              <div key={item.id}>
                <span>
                  <i style={{ background: item.color }} />
                  {item.label}
                </span>
                <strong>{formatPercent(item.weight, { signed: false })}</strong>
              </div>
            ))}
          </div>
          <p className="ov-allocation-note">
            {allocationView === 'assetClass'
              ? t('overview.allocationNoteClass')
              : t('overview.allocationNoteType')}
          </p>
        </>
      ) : (
        <p className="ov-allocation-note">{t('overview.allocationEmpty')}</p>
      )}

      {allocationView === 'assetClass' ? (
        <AssetClassTarget
          isError={rebalanceQuery.isError}
          isLoading={rebalanceQuery.isLoading}
          trackedMarketValue={plan?.trackedMarketValue ?? 0}
          gap={gap}
        />
      ) : null}
    </section>
  )
}

function allocationViewLabel(
  value: AllocationViewMode,
  t: (key: string) => string,
) {
  return value === 'assetClass'
    ? t('overview.viewAssetClass')
    : t('overview.viewProductType')
}

function AssetClassTarget({
  isError,
  isLoading,
  trackedMarketValue,
  gap,
}: {
  isError: boolean
  isLoading: boolean
  trackedMarketValue: number
  gap: number | null
}) {
  const { t } = useI18n()

  return (
    <div className="ov-target">
      <p className="ov-eyebrow">{t('overview.targetEyebrow')}</p>
      <div className="ov-target-heading">
        <strong>{t('overview.targetEquity')}</strong>
        <span> / </span>
        <strong>{t('overview.targetBond')}</strong>
      </div>
      <p className="ov-muted">{t('overview.targetHint')}</p>
      {isError ? (
        <p className="ov-error">{t('overview.targetError')}</p>
      ) : isLoading ? (
        <p role="status">{t('overview.targetLoading')}</p>
      ) : trackedMarketValue > 0 && gap !== null ? (
        <div className="ov-insight">
          <span aria-hidden="true">◉</span>
          <p>{bondGapInsight(gap, t)}</p>
        </div>
      ) : (
        <p className="ov-muted">{t('overview.targetEmpty')}</p>
      )}
    </div>
  )
}
