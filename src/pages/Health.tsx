import EndpointTester from '../components/EndpointTester'

export default function Health() {
  return (
    <div>
      <h1>Health Check</h1>
      <p>Test the health endpoint to verify backend connectivity</p>

      <EndpointTester method="GET" endpoint="/health" />
    </div>
  )
}
