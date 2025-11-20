import EndpointTester from '../components/EndpointTester'
import DataDisplay from '../components/DataDisplay'
import { useState } from 'react'

export default function Accounts() {
  const [accountId, setAccountId] = useState('')
  const [userId, setUserId] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div>
      <h1>Accounts API</h1>
      <p>View and test account management endpoints</p>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
        <label style={{ display: 'block', marginBottom: '10px' }}>
          <strong>Filter by User ID:</strong>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID (optional)"
            style={{
              marginLeft: '10px',
              padding: '5px',
              width: '300px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </label>
        <label style={{ display: 'block' }}>
          <strong>Account ID (for single operations):</strong>
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="Enter account ID"
            style={{
              marginLeft: '10px',
              padding: '5px',
              width: '300px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </label>
      </div>

      <DataDisplay
        key={refreshKey}
        endpoint="/accounts"
        queryKey={['accounts']}
        queryParams={userId ? { userId } : {}}
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Name' },
          { key: 'type', label: 'Type' },
          { key: 'currency', label: 'Currency' },
          { key: 'userId', label: 'User ID' },
          {
            key: 'createdAt',
            label: 'Created At',
            render: (value) =>
              value ? new Date(value).toLocaleString() : '-',
          },
        ]}
        title="Accounts List"
        onRowClick={(row) => {
          setAccountId(row.id)
        }}
      />

      <div style={{ marginTop: '30px' }}>
        <h2>Test Endpoints</h2>
        <EndpointTester
          method="GET"
          endpoint="/accounts"
          queryParams={{ userId: userId }}
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
          endpoint="/accounts"
          defaultBody={{
            userId: 'c2610e4e-1cca-401e-afa7-1ebf541d0000',
            name: 'My Broker Account',
            type: 'broker',
            currency: 'TWD',
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

        {accountId && (
          <>
            <EndpointTester
              method="GET"
              endpoint={`/accounts/${accountId}`}
            />

            <EndpointTester
              method="PATCH"
              endpoint={`/accounts/${accountId}`}
              defaultBody={{
                userId: 'c2610e4e-1cca-401e-afa7-1ebf541d0000',
                name: 'Updated Account Name',
                type: 'broker',
                currency: 'TWD',
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
                  Refresh Data After Update
                </button>
              }
            />

            <EndpointTester
              method="DELETE"
              endpoint={`/accounts/${accountId}`}
              children={
                <button
                  onClick={() => {
                    setRefreshKey((k) => k + 1)
                    setAccountId('')
                  }}
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
                  Refresh Data After Delete
                </button>
              }
            />
          </>
        )}
      </div>
    </div>
  )
}

