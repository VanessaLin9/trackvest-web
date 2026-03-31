import { useState } from 'react'
import EndpointTester from '../components/EndpointTester'
import DataDisplay from '../components/DataDisplay'
import { useI18n } from '../i18n'

export default function Users() {
  const { t } = useI18n()
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div>
      <h1>{t('users.title')}</h1>
      <p>{t('users.subtitle')}</p>

      <DataDisplay
        key={refreshKey}
        endpoint="/users"
        queryKey={['users']}
        columns={[
          { key: 'id', label: t('users.id') },
          { key: 'email', label: t('users.email') },
          { key: 'role', label: t('users.role') },
          {
            key: 'createdAt',
            label: t('users.createdAt'),
            render: (value) =>
              value ? new Date(value).toLocaleString() : '-',
          },
        ]}
        title={t('users.usersList')}
        onRowClick={(row) => {
          console.log('Selected user:', row)
        }}
      />

      <div className="mt-8">
        <h2>{t('users.testEndpoints')}</h2>
        <EndpointTester
          method="GET"
          endpoint="/users"
          children={
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="mb-2.5 px-2.5 py-1 bg-green-600 text-white border-none rounded cursor-pointer hover:bg-green-700"
            >
              {t('users.refreshAfterTest')}
            </button>
          }
        />

        <EndpointTester
          method="POST"
          endpoint="/users"
          defaultBody={{
            email: 'user@example.com',
            password: 'user123',
          }}
          children={
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="mb-2.5 px-2.5 py-1 bg-green-600 text-white border-none rounded cursor-pointer hover:bg-green-700"
            >
              {t('users.refreshAfterCreate')}
            </button>
          }
        />
      </div>
    </div>
  )
}
