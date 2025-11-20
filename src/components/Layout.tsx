import { Outlet, Link, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Health' },
  { path: '/users', label: 'Users' },
  { path: '/accounts', label: 'Accounts' },
  { path: '/assets', label: 'Assets' },
  { path: '/transactions', label: 'Transactions' },
  { path: '/gl', label: 'GL Ledger' },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="flex min-h-screen">
      <nav className="w-[200px] bg-gray-100 p-5 border-r border-gray-300">
        <h2 className="mt-0 mb-5">API Testing</h2>
        <ul className="list-none p-0 m-0">
          {navItems.map((item) => (
            <li key={item.path} className="mb-2.5">
              <Link
                to={item.path}
                className={`block p-2.5 no-underline rounded ${
                  location.pathname === item.path
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-800 bg-transparent hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-5">
        <Outlet />
      </main>
    </div>
  )
}

