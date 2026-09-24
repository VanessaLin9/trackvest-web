/** 目錄寫入只認 admin。角色字串尚未統一，API 是 admin、前端型別是 ADMIN，這裡先不區分大小寫（PR #26）。授權在 trackvest-api PR #46。 */
export function canWriteAssetCatalog(role: string): boolean {
  return role.toLowerCase() === 'admin'
}
