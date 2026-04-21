import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { getNavItems } from '../app/route-config'
import { useAuth } from '../app/use-auth'
import { useI18n } from '../i18n'

const navItems = getNavItems()

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { locale, setLocale, t } = useI18n()
  const { user, logout } = useAuth()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen">
      <nav className="w-[200px] bg-gray-100 p-5 border-r border-gray-300">
        <div className="mb-6">
          <div className="mb-4 pb-4 border-b border-gray-200/80">
            <p className="mt-0 mb-1 text-[11px] uppercase tracking-[0.24em] text-gray-500">
              {t('app.name')}
            </p>
            <h2 className="m-0 text-xl font-semibold tracking-tight text-slate-900">
              {t('app.navigationTitle')}
            </h2>
          </div>

          <div
            role="group"
            aria-label={t('app.languageLabel')}
            className="inline-flex rounded-full border border-gray-200 bg-white p-0.5"
          >
            {[
              {
                value: 'en',
                shortLabel: 'EN',
                fullLabel: t('locales.en'),
              },
              {
                value: 'zh-TW',
                shortLabel: '中',
                fullLabel: t('locales.zhTw'),
              },
            ].map((option) => {
              const isActive = locale === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLocale(option.value as typeof locale)}
                  aria-pressed={isActive}
                  aria-label={option.fullLabel}
                  title={option.fullLabel}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {option.shortLabel}
                </button>
              )
            })}
          </div>
        </div>

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
                {t(item.labelKey)}
              </Link>
            </li>
          ))}
        </ul>

        {user && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <p className="mb-2 break-all text-xs text-gray-500">{user.email}</p>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
            >
              {t('auth.logout')}
            </button>
          </div>
        )}
      </nav>
      <main className="flex-1 p-5">
        <Outlet />
      </main>
    </div>
  )
}
