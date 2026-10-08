/** 目錄寫入只認小寫 admin，與 API UserRole 一致（PR #26）。授權在 trackvest-api PR #46。 */
export function canWriteAssetCatalog(role: string): boolean {
  return role === 'admin'
}
