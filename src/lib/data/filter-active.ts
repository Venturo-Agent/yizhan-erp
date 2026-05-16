/**
 * Server-side 軟刪除過濾 helper
 *
 * 配 src/data/core/createEntityHook.ts（client-side filterSoftDeleted）
 * 用意：把「過濾 deleted_at IS NULL」的 pattern 集中於此、
 * 其他 server-side（API route / lib）一律走這個 helper、不要散用 .is('deleted_at', null)。
 *
 * 用法：
 *   let query = supabase.from('orders').select('...').eq('workspace_id', ws)
 *   query = filterActive(query)
 *
 * 整 codebase 只有此處 reference 軟刪除欄位字串、其他位置 pre-commit 守門。
 */

const SOFT_DELETE_COLUMN = 'deleted_at'

type IsFilter<Q> = { is: (column: string, value: null) => Q }

export function filterActive<Q extends IsFilter<Q>>(query: Q): Q {
  return query.is(SOFT_DELETE_COLUMN, null)
}
