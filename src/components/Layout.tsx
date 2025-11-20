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
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav
        style={{
          width: '200px',
          backgroundColor: '#f5f5f5',
          padding: '20px',
          borderRight: '1px solid #ddd',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>API Testing</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {navItems.map((item) => (
            <li key={item.path} style={{ marginBottom: '10px' }}>
              <Link
                to={item.path}
                style={{
                  display: 'block',
                  padding: '10px',
                  textDecoration: 'none',
                  color: location.pathname === item.path ? '#007bff' : '#333',
                  backgroundColor:
                    location.pathname === item.path ? '#e7f3ff' : 'transparent',
                  borderRadius: '4px',
                }}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main style={{ flex: 1, padding: '20px' }}>
        <Outlet />
      </main>
    </div>
  )
}

