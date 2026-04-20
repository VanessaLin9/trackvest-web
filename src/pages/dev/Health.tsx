import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import EndpointTester from '../../components/dev/EndpointTester'
import { Button } from '../../components/ui/Button'
import { useI18n } from '../../i18n'
import { queryKeys } from '../../lib/query-keys'

export default function Health() {
  const { t } = useI18n()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.health(),
    queryFn: async () => (await api.get('/health')).data,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  })

  return (
    <div>
      <h1>{t('health.title')}</h1>
      <p>{t('health.subtitle')}</p>

      <div className="mb-8 border border-gray-300 rounded-lg p-5 bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="m-0">{t('health.backendStatus')}</h2>
          <Button onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? t('common.loading') : `🔄 ${t('common.refresh')}`}
          </Button>
        </div>

        {isLoading && (
          <div className="p-5 text-center">{t('common.loading')}</div>
        )}

        {error && (
          <div className="p-4 bg-red-100 text-red-800 rounded">
            <strong>❌ {t('health.backendUnavailable')}</strong>
            <div className="mt-2.5">
              {(error as { response?: { data?: { message?: string } } })?.response?.data?.message || String(error)}
            </div>
          </div>
        )}

        {!isLoading && !error && data && (
          <div className="p-4 bg-green-100 text-green-800 rounded flex items-center gap-2.5">
            <span className="text-2xl">✓</span>
            <div>
              <strong>{t('health.backendHealthy')}</strong>
              <pre className="mt-2.5 mb-0 bg-black/5 p-2.5 rounded">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2>{t('health.testEndpoint')}</h2>
        <EndpointTester method="GET" endpoint="/health" />
      </div>
    </div>
  )
}
