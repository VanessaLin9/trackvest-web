import { Outlet, Link, useLocation } from 'react-router-dom'
import { getNavItems } from '../app/route-config'
import { useI18n } from '../i18n'

const navItems = getNavItems()

export default function Layout() {
  const location = useLocation()
  const { locale, setLocale, t } = useI18n()

  return (
    <div className="flex min-h-screen">
      <nav className="w-[200px] bg-gray-100 p-5 border-r border-gray-300">
        <div className="mb-5 space-y-3">
          <div>
            <p className="mt-0 mb-1 text-xs uppercase tracking-[0.2em] text-gray-500">
              {t('app.name')}
            </p>
            <h2 className="m-0">{t('app.navigationTitle')}</h2>
          </div>

          <label className="block text-sm text-gray-700">
            <span className="mb-1 block font-medium">
              {t('app.languageLabel')}
            </span>
            <select
              value={locale}
              onChange={(event) =>
                setLocale(event.target.value as typeof locale)
              }
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="en">{t('locales.en')}</option>
              <option value="zh-TW">{t('locales.zhTw')}</option>
            </select>
          </label>
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
      </nav>
      <main className="flex-1 p-5">
        <Outlet />
      </main>
    </div>
  )
}
