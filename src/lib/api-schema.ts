import type { components } from './api-types.generated'

/**
 * 前端回應型別來自 trackvest-api 的 openapi.json。
 * API 改 DTO 後先跑 `pnpm openapi:export`，再在這個 repo 跑 `pnpm openapi:types`（PR #26）。
 */
export type ApiSchemas = components['schemas']
