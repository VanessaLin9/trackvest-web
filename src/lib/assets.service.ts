import { api } from './api'

export const ASSET_TYPE_OPTIONS = ['equity', 'etf', 'crypto', 'cash'] as const
export const BASE_CURRENCY_OPTIONS = ['USD', 'TWD', 'JPY', 'EUR'] as const

export type AssetType = (typeof ASSET_TYPE_OPTIONS)[number]

export type Asset = {
  id: string
  symbol: string
  name: string
  type: AssetType
  baseCurrency: string
}

export type SaveAssetPayload = {
  symbol: string
  name: string
  type: AssetType
  baseCurrency: string
}

export const assetsService = {
  async getAssets(): Promise<Asset[]> {
    const response = await api.get<Asset[]>('/assets')
    return response.data
  },

  async createAsset(payload: SaveAssetPayload): Promise<Asset> {
    const response = await api.post<Asset>('/assets', payload)
    return response.data
  },
}
