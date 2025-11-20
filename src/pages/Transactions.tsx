import EndpointTester from '../components/EndpointTester'
import DataDisplay from '../components/DataDisplay'
import { useState } from 'react'

export default function Transactions() {
  const [transactionId, setTransactionId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [assetId, setAssetId] = useState('')
  const [type, setType] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div>
      <h1>Transactions API</h1>
      <p>View and test transaction management endpoints</p>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <label>
            <strong>Filter by Account ID:</strong>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="Optional"
              style={{
                marginLeft: '10px',
                padding: '5px',
                width: '200px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </label>
          <label>
            <strong>Filter by Asset ID:</strong>
            <input
              type="text"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="Optional"
              style={{
                marginLeft: '10px',
                padding: '5px',
                width: '200px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </label>
          <label>
            <strong>Filter by Type:</strong>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Optional"
              style={{
                marginLeft: '10px',
                padding: '5px',
                width: '200px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </label>
        </div>
        <label style={{ display: 'block' }}>
          <strong>Transaction ID (for single operations):</strong>
          <input
            type="text"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="Enter transaction ID"
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
        endpoint="/transactions"
        queryKey={['transactions']}
        queryParams={{
          ...(accountId && { accountId }),
          ...(assetId && { assetId }),
          ...(type && { type }),
        }}
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'accountId', label: 'Account ID' },
          { key: 'assetId', label: 'Asset ID' },
          { key: 'type', label: 'Type' },
          {
            key: 'amount',
            label: 'Amount',
            render: (value) => (value ? Number(value).toLocaleString() : '-'),
          },
          {
            key: 'quantity',
            label: 'Quantity',
            render: (value) => (value ? Number(value).toLocaleString() : '-'),
          },
          {
            key: 'price',
            label: 'Price',
            render: (value) => (value ? Number(value).toFixed(2) : '-'),
          },
          {
            key: 'fee',
            label: 'Fee',
            render: (value) => (value ? Number(value).toFixed(2) : '-'),
          },
          {
            key: 'tradeTime',
            label: 'Trade Time',
            render: (value) =>
              value ? new Date(value).toLocaleString() : '-',
          },
          { key: 'note', label: 'Note' },
          {
            key: 'isDeleted',
            label: 'Deleted',
            render: (value) => (value ? '✓' : '✗'),
          },
        ]}
        title="Transactions List"
        onRowClick={(row) => {
          setTransactionId(row.id)
        }}
      />

      <div style={{ marginTop: '30px' }}>
        <h2>Test Endpoints</h2>
        <EndpointTester
          method="GET"
          endpoint="/transactions"
          queryParams={{
            accountId: accountId || '',
            assetId: assetId || '',
            type: type || '',
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
              Refresh Data After Test
            </button>
          }
        />

        <EndpointTester
          method="POST"
          endpoint="/transactions"
          defaultBody={{
            accountId: 'c2610e4e-1cca-401e-afa7-1ebf541d0000',
            assetId: 'c2610e4e-1cca-401e-afa7-1ebf541d0000',
            type: 'buy',
            amount: 1000,
            quantity: 10,
            price: 100,
            fee: 5,
            tradeTime: '2025-01-01T10:00:00Z',
            note: 'Test transaction',
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

        {transactionId && (
          <>
            <EndpointTester
              method="GET"
              endpoint={`/transactions/${transactionId}`}
            />

            <EndpointTester
              method="PATCH"
              endpoint={`/transactions/${transactionId}`}
              defaultBody={{
                amount: 1200,
                note: 'Updated transaction',
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
              endpoint={`/transactions/${transactionId}`}
              children={
                <button
                  onClick={() => {
                    setRefreshKey((k) => k + 1)
                    setTransactionId('')
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

            <EndpointTester
              method="DELETE"
              endpoint={`/transactions/${transactionId}/hard`}
              children={
                <button
                  onClick={() => {
                    setRefreshKey((k) => k + 1)
                    setTransactionId('')
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
                  Refresh Data After Hard Delete
                </button>
              }
            />
          </>
        )}
      </div>
    </div>
  )
}

