/**
 * entityHookRegistry — 收集所有 createEntityHook 出來的 useList swrKey
 *
 * 為什麼存在（2026-05-18 William 拍板）：
 *   原本 invalidateEntity 用 globalMutate(predicate, undefined, { revalidate: true })、
 *   讓 SWR iterate cache 比對 prefix 觸發 revalidation。實測對 entity hook 的
 *   cache key 結構（包 select hash + filter JSON）行為不可靠、寫完看不到 server
 *   真實狀態、要 F5。
 *
 *   改用 register pattern：useList / useListSlim / useDictionary 在 mount 時把
 *   自己的具體 swrKey 註冊進 module-level Map、unmount 時移除。invalidateEntity
 *   時 iterate 該 table 對應的 Set、對每個 string key 直接呼叫 globalMutate(key)
 *   —— SWR 對單一 string key 的行為穩定可靠（line ai hub apiMutate 同概念）。
 *
 * 設計：
 *   - module-level Map（生命週期跟 app 一樣、不依賴 React tree）
 *   - 用 tableName 分桶、避免 iterate 全 app 所有 hook 浪費
 *   - 同個 swrKey 多 component instance 訂閱也只算一個 key（Set dedupe）、SWR
 *     對該 key 的 mutate 會通知所有訂閱者
 */

const SWR_KEY_REGISTRY = new Map<string, Set<string>>()

/**
 * useList / useListSlim / useDictionary mount 時 call。
 */
export function registerSwrKey(tableName: string, swrKey: string): void {
  let bucket = SWR_KEY_REGISTRY.get(tableName)
  if (!bucket) {
    bucket = new Set()
    SWR_KEY_REGISTRY.set(tableName, bucket)
  }
  bucket.add(swrKey)
}

/**
 * useList / useListSlim / useDictionary unmount 時 call。
 */
export function unregisterSwrKey(tableName: string, swrKey: string): void {
  const bucket = SWR_KEY_REGISTRY.get(tableName)
  if (bucket) {
    bucket.delete(swrKey)
    if (bucket.size === 0) {
      SWR_KEY_REGISTRY.delete(tableName)
    }
  }
}

/**
 * invalidateEntity 用：拿到該 table 所有 mounted hook 的 swrKey。
 */
export function getRegisteredKeysForTable(tableName: string): string[] {
  const bucket = SWR_KEY_REGISTRY.get(tableName)
  return bucket ? Array.from(bucket) : []
}

/**
 * 測試用：清空 registry（vitest beforeEach）。
 */
export function _clearRegistryForTest(): void {
  SWR_KEY_REGISTRY.clear()
}
