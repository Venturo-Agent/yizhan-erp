'use client'

/**
 * scoped-mutate — SWR mutate 的對的 cache 入口
 *
 * 為什麼存在（2026-05-19 William 拍板「完整修復」）：
 *   SWR v2 用 `<SWRConfig provider={...}>` 自訂 cache 後、`import { mutate } from 'swr'`
 *   仍 bind 到模組頂層的「預設 cache」（new Map() at config-context-...mjs line 482）。
 *   useSWR 在 SWRConfig 內把 revalidator 註冊在「自訂 cache」、但 globalMutate(key) 去
 *   查預設 cache 的 EVENT_REVALIDATORS、永遠 miss → 任何寫入後的 refetch 都不會觸發、
 *   UI 永遠卡 stale 要 F5。
 *
 *   修法：
 *   1. MutateBinder（在 SWRProvider 內 render）用 `useSWRConfig().mutate` 拿到 bound 到
 *      自訂 cache 的 mutate
 *   2. 用 useLayoutEffect 把它寫進 module-level `_boundMutate` 變數
 *   3. 本檔 export 的 `mutate` 統一走 `_boundMutate`、未初始化前 fallback 到 SWR 原 mutate
 *      （只發生在 React 首次 commit 前、應用 lifecycle 不可能撞到）
 *
 *   所有 entity hook / api-mutate / realtime / 散裝 caller 都 import 這支、不直接從 'swr'
 *   抓 mutate。
 *
 * 對齊紅線：
 *   - 紅線 F（不准散刻 useSWR / mutate）：本檔就是這條紅線的 SSOT
 *   - 紅線 G（per-user cache key）：不動 cache key 命名、純修 mutate routing
 */

import { mutate as defaultMutate } from 'swr'

// 跟 SWR 內部 ScopedMutator 同型、確保 caller 的 predicate / data callback 類型推論不退化
type MutateFn = typeof defaultMutate

let _boundMutate: MutateFn | null = null

/**
 * MutateBinder 內部用：把 useSWRConfig().mutate 寫進 module-level。
 * 不該在其他地方 call。
 */
export function _setBoundMutate(m: MutateFn): void {
  _boundMutate = m
}

/**
 * 對的 mutate — 跟 `import { mutate } from 'swr'` 簽名一樣、但走自訂 cache。
 *
 * 用法：
 * ```ts
 * import { mutate } from '@/lib/swr/scoped-mutate'
 * await mutate('some-key')                    // 單 key revalidate
 * await mutate('key', newData, false)         // 寫 cache、不 revalidate
 * await mutate(key => key.startsWith('foo'))  // predicate revalidate
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mutate: MutateFn = ((...args: any[]) => {
  const m = (_boundMutate ?? defaultMutate) as (...a: unknown[]) => Promise<unknown>
  return m(...args)
}) as MutateFn
