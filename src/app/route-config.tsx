import type React from 'react'
import Dashboard from '../pages/Dashboard'
import Overview from '../pages/Overview'
import Performance from '../pages/Performance'
import PerformancePoc from '../pages/PerformancePoc'
import Health from '../pages/dev/Health'
import Users from '../pages/dev/Users'
import Accounts from '../pages/Accounts'
import Assets from '../pages/Assets'
import Transactions from '../pages/Transactions'
import GL from '../pages/dev/GL'
import CashbookPage from '../pages/CashbookPage'

export interface RouteConfig {
  path: string
  labelKey: string
  element: React.ReactNode
  showInNav?: boolean
}

export const routeConfig: RouteConfig[] = [
  // 首頁改走 Overview；舊 Dashboard 留在 /overview-previous 方便對照，不要刪（PR #30）
  { path: '/', labelKey: 'routes.dashboard', element: <Overview />, showInNav: true },
  { path: '/overview-previous', labelKey: 'routes.dashboard', element: <Dashboard />, showInNav: false },
  { path: '/performance', labelKey: 'routes.performance', element: <PerformancePoc />, showInNav: true },
  { path: '/performance-previous', labelKey: 'routes.performance', element: <Performance />, showInNav: false },
  { path: '/cashbook', labelKey: 'routes.cashbook', element: <CashbookPage />, showInNav: true },
  { path: '/investments', labelKey: 'routes.investments', element: <Transactions />, showInNav: true },
  { path: '/gl', labelKey: 'routes.ledger', element: <GL />, showInNav: false },
  { path: '/health', labelKey: 'routes.health', element: <Health />, showInNav: false },
  { path: '/users', labelKey: 'routes.users', element: <Users />, showInNav: false },
  { path: '/accounts', labelKey: 'routes.accounts', element: <Accounts />, showInNav: true },
  { path: '/assets', labelKey: 'routes.assets', element: <Assets />, showInNav: true },
]

export const getNavItems = () => {
  return routeConfig.filter((route) => route.showInNav !== false)
}
