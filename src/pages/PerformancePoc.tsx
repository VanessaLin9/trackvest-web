import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { AnnualBuyAllocationCard } from '../components/performance/AnnualBuyAllocationCard'
import { AssetHistoryCard } from '../components/performance/AssetHistoryCard'
import { LiveRealizedExplorer } from '../components/performance-poc/LiveRealizedExplorer'
import { RealizedExplorer } from '../components/performance-poc/RealizedExplorer'
import { useI18n } from '../i18n'
import './PerformancePoc.css'

type Section = 'realized' | 'buys' | 'history'

export default function PerformancePoc() {
  const { t } = useI18n()
  const text = (key: string) => t(`performancePoc.${key}`)
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const requestedTab = params.get('tab')
  const section: Section = requestedTab === 'buys' || requestedTab === 'history'
    ? requestedTab
    : requestedTab === 'realized' ? 'realized'
      : location.hash === '#asset-history' ? 'history'
        : location.hash === '#annual-buys' ? 'buys' : 'realized'
  const source = params.get('source') === 'demo' ? 'demo' : 'live'
  function select(key: string, value: string) {
    setParams(current => { const next = new URLSearchParams(current); next.set(key, value); return next })
  }

  return (
    <div className="performance-poc">
      <header className="pf-header"><div><p className="pf-eyebrow">{text('eyebrow')}</p><h1>{text('title')}</h1><p>{text('subtitle')}</p></div><span className="pf-poc-label">POC</span></header>
      <div className="pf-navigation">
        <div className="pf-tabs" role="tablist" aria-label={text('title')} onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
          event.preventDefault()
          const sections: Section[] = ['realized', 'buys', 'history']
          const index = sections.indexOf(section)
          const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3
          select('tab', sections[nextIndex])
          event.currentTarget.querySelector<HTMLButtonElement>(`#pf-tab-${sections[nextIndex]}`)?.focus()
        }}>
          {(['realized', 'buys', 'history'] as const).map(key => <button key={key} role="tab" id={`pf-tab-${key}`} aria-controls="pf-content" aria-selected={section === key} tabIndex={section === key ? 0 : -1} onClick={() => select('tab', key)}>{text(key)}</button>)}
        </div>
        {section === 'realized' && <div className="pf-segment" role="group" aria-label="POC data source">
          <button aria-pressed={source === 'demo'} onClick={() => select('source', 'demo')}>{text('demo')}</button>
          <button aria-pressed={source === 'live'} onClick={() => select('source', 'live')}>{text('live')}</button>
        </div>}
      </div>
      <div className={`pf-source-notice ${section === 'realized' && source === 'demo' ? 'pf-source-demo' : ''}`} role="status">
        <span aria-hidden="true">◉</span> {text(section !== 'realized' ? 'legacyNotice' : source === 'demo' ? 'demoNotice' : 'liveNotice')}
      </div>
      <div id="pf-content" role="tabpanel" aria-labelledby={`pf-tab-${section}`} className="pf-section-content">
        {section === 'realized' ? <>{source === 'demo' ? <RealizedExplorer /> : <LiveRealizedExplorer />}</>
          : <div className="pf-existing-content">{section === 'buys' ? <AnnualBuyAllocationCard variant="page" /> : <AssetHistoryCard variant="page" />}</div>}
      </div>
      <footer className="pf-footer"><span>TRACKVEST / {text('eyebrow')}</span><Link to="/performance-previous">{text('previous')} ↗</Link></footer>
    </div>
  )
}
