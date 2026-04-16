import { api } from './api'

export type FxCurrentRate = {
  base: string
  quote: string
  rate: number
  date: string
  provider: 'db' | 'frankfurter' | 'identity'
}

type FxCurrentRateQuery = {
  base?: string
  quote?: string
}

export const fxService = {
  async getCurrentRate(query: FxCurrentRateQuery = {}): Promise<FxCurrentRate> {
    const response = await api.get<FxCurrentRate>('/fx/rates/current', {
      params: {
        base: query.base,
        quote: query.quote,
      },
    })

    return response.data
  },
}
