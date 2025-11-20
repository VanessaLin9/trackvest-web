interface DataTableProps<T> {
  data: T[]
  columns: {
    key: keyof T | string
    label: string
    render?: (value: any, row: T) => React.ReactNode
  }[]
  onRowClick?: (row: T) => void
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          color: '#666',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
        }}
      >
        No data available
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: 'white',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  borderBottom: '2px solid #dee2e6',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              onClick={() => onRowClick?.(row)}
              style={{
                cursor: onRowClick ? 'pointer' : 'default',
                borderBottom: '1px solid #dee2e6',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (onRowClick) {
                  e.currentTarget.style.backgroundColor = '#f8f9fa'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
              }}
            >
              {columns.map((col) => {
                const value = col.render
                  ? col.render(row[col.key as keyof T], row)
                  : row[col.key as keyof T]
                return (
                  <td
                    key={String(col.key)}
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #dee2e6',
                    }}
                  >
                    {value ?? '-'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

