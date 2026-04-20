import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useI18n } from '../../i18n'
import DataTable from '../DataTable'
import { Button } from '../ui/Button'

type DataRow = Record<string, unknown>

interface DataDisplayProps {
  endpoint: string
  queryKey: string[]
  queryParams?: Record<string, string>
  columns: {
    key: string
    label: string
    render?: (value: unknown, row: DataRow) => React.ReactNode
  }[]
  title: string
  onRowClick?: (row: DataRow) => void
}

export default function DataDisplay({
  endpoint,
  queryKey,
  queryParams = {},
  columns,
  title,
  onRowClick,
}: DataDisplayProps) {
  const { t, locale } = useI18n()
  const queryString = Object.entries(queryParams)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')
  const url = queryString ? `${endpoint}?${queryString}` : endpoint

  const { data, isLoading, error, refetch } = useQuery<DataRow[]>({
    queryKey: [...queryKey, queryParams],
    queryFn: async () => {
      const response = await api.get<unknown>(url)
      const payload = response.data
      return (Array.isArray(payload) ? payload : [payload]) as DataRow[]
    },
  })

  const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleString(locale)
  }

  return (
    <div className="mb-8 border border-gray-300 rounded-lg p-5 bg-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="m-0">{title}</h2>
        <Button onClick={() => refetch()} disabled={isLoading}>
          {isLoading ? t('common.loading') : `🔄 ${t('common.refresh')}`}
        </Button>
      </div>

      {isLoading && (
        <div className="p-5 text-center">{t('common.loading')}</div>
      )}

      {error && (
        <div className="p-4 bg-red-100 text-red-800 rounded">
          <strong>{t('common.error')}:</strong>{' '}
          {(error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || String(error)}
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          <div className="mb-2.5 text-gray-600 text-sm">
            {t('common.itemCount', { count: data.length })}
          </div>
          <DataTable<DataRow>
            data={data}
            columns={columns.map((col) => ({
              ...col,
              render:
                col.render ||
                ((value) => {
                  if (value === null || value === undefined) return '-'
                  if (typeof value === 'boolean') return value ? '✓' : '✗'
                  if (value instanceof Date) return formatDate(value)
                  if (
                    typeof value === 'string' &&
                    /^\d{4}-\d{2}-\d{2}/.test(value)
                  ) {
                    return formatDate(value)
                  }
                  return String(value)
                }),
            }))}
            onRowClick={onRowClick}
          />
        </>
      )}
    </div>
  )
}
