import EndpointTester from '../components/EndpointTester'

export default function Users() {
  return (
    <div>
      <h1>Users API</h1>
      <p>Test user management endpoints</p>

      <EndpointTester
        method="GET"
        endpoint="/users"
      />

      <EndpointTester
        method="POST"
        endpoint="/users"
        defaultBody={{
          email: 'user@example.com',
          password: 'user123',
        }}
      />
    </div>
  )
}

