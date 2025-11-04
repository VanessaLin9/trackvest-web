import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export default function Health() {
  const q = useQuery({
    queryKey: ['health'],
    queryFn: async () => (await api.get('/health')).data,
  })
  if (q.isLoading) return <p>Loading...</p>
  if (q.error) return <pre>{String(q.error)}</pre>
  return <pre>{JSON.stringify(q.data, null, 2)}</pre>
}
