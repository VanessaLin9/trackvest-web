import type React from 'react'
import Dashboard from '../pages/Dashboard'
import Health from '../pages/Health'
import Users from '../pages/Users'
import Accounts from '../pages/Accounts'
import Assets from '../pages/Assets'
import Transactions from '../pages/Transactions'
import GL from '../pages/GL'
import CashbookPage from '../pages/CashbookPage'

export interface RouteConfig {
  path: string
  label: string
  element: React.ReactNode
  showInNav?: boolean // Optional: hide from nav if needed
}

export const routeConfig: RouteConfig[] = [
  { path: '/', label: 'Dashboard', element: <Dashboard />, showInNav: true },
  { path: '/cashbook', label: 'Cashbook', element: <CashbookPage />, showInNav: true },
  { path: '/transactions', label: 'Investments', element: <Transactions />, showInNav: true },
  { path: '/gl', label: 'Ledger', element: <GL />, showInNav: true },
  { path: '/health', label: 'Health', element: <Health />, showInNav: false },
  { path: '/users', label: 'Users', element: <Users />, showInNav: false },
  { path: '/accounts', label: 'Accounts', element: <Accounts />, showInNav: false },
  { path: '/assets', label: 'Assets', element: <Assets />, showInNav: true },
]

// Helper to get nav items (filtered by showInNav)
export const getNavItems = () => {
  return routeConfig.filter((route) => route.showInNav !== false)
}
