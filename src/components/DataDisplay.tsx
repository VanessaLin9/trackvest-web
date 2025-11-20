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
    <div
      style={{
        marginBottom: '30px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        backgroundColor: 'white',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
        }}
      >
        <h2 style={{ margin: 0 }}>{title}</h2>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? 'Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {isLoading && (
        <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
      )}

      {error && (
        <div
          style={{
            padding: '15px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
          }}
        >
          <strong>Error:</strong>{' '}
          {(error as any)?.response?.data?.message || String(error)}
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          <div style={{ marginBottom: '10px', color: '#666', fontSize: '14px' }}>
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

