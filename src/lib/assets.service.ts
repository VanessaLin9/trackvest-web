import { api } from './api'

export const ASSET_TYPE_OPTIONS = ['equity', 'etf', 'crypto', 'cash'] as const
export const ASSET_CLASS_OPTIONS = [
  'equity',
  'bond',
  'cash',
  'crypto',
  'precious_metal',
] as const
export const BASE_CURRENCY_OPTIONS = ['USD', 'TWD'] as const

export type AssetType = (typeof ASSET_TYPE_OPTIONS)[number]
export type AssetClass = (typeof ASSET_CLASS_OPTIONS)[number]

export type Asset = {
  id: string
  symbol: string
  name: string
  type: AssetType
  assetClass?: AssetClass | null
  baseCurrency: string
}

export type SaveAssetPayload = {
  symbol: string
  name: string
  type: AssetType
  baseCurrency: string
}

export type GetAssetsParams = {
  q?: string
  type?: AssetType
  baseCurrency?: string
  page?: number
  take?: number
}

export type AssetListResponse = {
  items: Asset[]
  total: number
  page: number
  take: number
}

export const assetsService = {
  async getAssets(params: GetAssetsParams = {}): Promise<AssetListResponse> {
    const response = await api.get<AssetListResponse>('/assets', { params })
    return response.data
  },

  async createAsset(payload: SaveAssetPayload): Promise<Asset> {
    const response = await api.post<Asset>('/assets', payload)
    return response.data
  },

  async updateAsset(id: string, payload: SaveAssetPayload): Promise<Asset> {
    const response = await api.patch<Asset>(`/assets/${id}`, payload)
    return response.data
  },
}
