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
      <div className="p-5 text-center text-gray-600 bg-gray-50 rounded">
        No data available
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse bg-white rounded overflow-hidden">
        <thead>
          <tr className="bg-gray-50">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="p-3 text-left font-bold border-b-2 border-gray-300"
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
              className={`border-b border-gray-300 transition-colors ${
                onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
              }`}
            >
              {columns.map((col) => {
                const value = col.render
                  ? col.render(row[col.key as keyof T], row)
                  : row[col.key as keyof T]
                return (
                  <td
                    key={String(col.key)}
                    className="p-3 border-b border-gray-300"
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

