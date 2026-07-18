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
  assetClass: AssetClass
  baseCurrency: string
}

export type GetAssetsParams = {
  q?: string
  type?: AssetType
  assetClass?: AssetClass
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

/** Alias-create accepts only Cathay in the current repair flow. */
export const SUPPORTED_BROKER_FOR_ALIAS = 'cathay' as const

export type CreateAssetAliasPayload = {
  alias: string
  broker: typeof SUPPORTED_BROKER_FOR_ALIAS
}

export type AssetAliasMappedAsset = {
  id: string
  symbol: string
  name: string
}

export type AssetAliasResponse = {
  id: string
  assetId: string
  alias: string
  broker: string
  asset: AssetAliasMappedAsset
}

export type AssetAliasConflictResponse = {
  code: 'ASSET_ALIAS_CONFLICT'
  message: string
  existingAsset: AssetAliasMappedAsset
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

  async createAssetAlias(
    assetId: string,
    payload: CreateAssetAliasPayload,
  ): Promise<AssetAliasResponse> {
    const response = await api.post<AssetAliasResponse>(
      `/assets/${assetId}/aliases`,
      payload,
    )
    return response.data
  },
}
