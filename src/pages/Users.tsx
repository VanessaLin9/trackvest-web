import { useState } from 'react'
import EndpointTester from '../components/EndpointTester'
import DataDisplay from '../components/DataDisplay'

export default function Users() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div>
      <h1>Users API</h1>
      <p>View and test user management endpoints</p>

      <DataDisplay
        key={refreshKey}
        endpoint="/users"
        queryKey={['users']}
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role' },
          {
            key: 'createdAt',
            label: 'Created At',
            render: (value) =>
              value ? new Date(value).toLocaleString() : '-',
          },
        ]}
        title="Users List"
        onRowClick={(row) => {
          console.log('Selected user:', row)
        }}
      />

      <div style={{ marginTop: '30px' }}>
        <h2>Test Endpoints</h2>
        <EndpointTester
          method="GET"
          endpoint="/users"
          children={
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              style={{
                marginBottom: '10px',
                padding: '5px 10px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Refresh Data After Test
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
              style={{
                marginBottom: '10px',
                padding: '5px 10px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Refresh Data After Create
            </button>
          }
        />
      </div>
    </div>
  )
}

