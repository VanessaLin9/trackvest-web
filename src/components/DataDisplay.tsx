import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import DataTable from './DataTable'

interface DataDisplayProps {
  endpoint: string
  queryKey: string[]
  queryParams?: Record<string, string>
  columns: {
    key: string
    label: string
    render?: (value: any, row: any) => React.ReactNode
  }[]
  title: string
  onRowClick?: (row: any) => void
}

export default function DataDisplay({
  endpoint,
  queryKey,
  queryParams = {},
  columns,
  title,
  onRowClick,
}: DataDisplayProps) {
  const queryString = Object.entries(queryParams)
    .filter(([_, v]) => v && v.trim())
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')
  const url = queryString ? `${endpoint}?${queryString}` : endpoint

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...queryKey, queryParams],
    queryFn: async () => {
      const response = await api.get(url)
      return Array.isArray(response.data) ? response.data : [response.data]
    },
  })

  const formatDate = (date: string | Date | null) => {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleString()
  }

  return (
    <div className="mb-8 border border-gray-300 rounded-lg p-5 bg-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="m-0">{title}</h2>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className={`px-4 py-2 bg-blue-600 text-white border-none rounded cursor-pointer transition-opacity ${
            isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {isLoading && (
        <div className="p-5 text-center">Loading...</div>
      )}

      {error && (
        <div className="p-4 bg-red-100 text-red-800 rounded">
          <strong>Error:</strong>{' '}
          {(error as any)?.response?.data?.message || String(error)}
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          <div className="mb-2.5 text-gray-600 text-sm">
            Found {data.length} {data.length === 1 ? 'item' : 'items'}
          </div>
          <DataTable
            data={data}
            columns={columns.map((col) => ({
              ...col,
              render: col.render || ((value) => {
                if (value === null || value === undefined) return '-'
                if (typeof value === 'boolean') return value ? '✓' : '✗'
                if (value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/))) {
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

