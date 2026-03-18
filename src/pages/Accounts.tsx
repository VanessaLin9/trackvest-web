import EndpointTester from '../components/EndpointTester'
import DataDisplay from '../components/DataDisplay'
import { useState } from 'react'
import { useCurrentUserId } from '../app/current-user'

export default function Accounts() {
  const [accountId, setAccountId] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const currentUserId = useCurrentUserId()

  if (!currentUserId) {
    return (
      <div>
        <h1>Accounts API</h1>
        <p className="text-red-600">
          VITE_DEMO_USER_ID is not set. Please set it in your .env file.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1>Accounts API</h1>
      <p>View and test account management endpoints</p>

      <div className="mb-5 p-4 bg-blue-50 rounded">
        <div className="mb-2.5">
          <strong>Current User ID:</strong> {currentUserId}
        </div>
        <label className="block">
          <strong>Account ID (for single operations):</strong>
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="Enter account ID"
            className="ml-2.5 p-1 w-[300px] border border-gray-300 rounded"
          />
        </label>
      </div>

      <DataDisplay
        key={refreshKey}
        endpoint="/accounts"
        queryKey={['accounts', currentUserId]}
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Name' },
          { key: 'type', label: 'Type' },
          { key: 'currency', label: 'Currency' },
          { key: 'broker', label: 'Broker' },
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

      <div className="mt-8">
        <h2>Test Endpoints</h2>
        <EndpointTester
          method="GET"
          endpoint="/accounts"
          children={
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="mb-2.5 px-2.5 py-1 bg-green-600 text-white border-none rounded cursor-pointer hover:bg-green-700"
            >
              Refresh Data After Test
            </button>
          }
        />

        <EndpointTester
          method="POST"
          endpoint="/accounts"
          defaultBody={{
            userId: currentUserId,
            name: 'My Broker Account',
            type: 'broker',
            currency: 'TWD',
            broker: 'fubon',
          }}
          children={
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="mb-2.5 px-2.5 py-1 bg-green-600 text-white border-none rounded cursor-pointer hover:bg-green-700"
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
                userId: currentUserId,
                name: 'Updated Account Name',
                type: 'broker',
                currency: 'TWD',
                broker: 'fubon',
              }}
              children={
                <button
                  onClick={() => setRefreshKey((k) => k + 1)}
                  className="mb-2.5 px-2.5 py-1 bg-green-600 text-white border-none rounded cursor-pointer hover:bg-green-700"
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
                  className="mb-2.5 px-2.5 py-1 bg-green-600 text-white border-none rounded cursor-pointer hover:bg-green-700"
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
