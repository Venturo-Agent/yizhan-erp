/**
 * apiMutate — 整合 fetch + SWR cache invalidation
 *
 * 設計（William 2026-05-17 拍板「真正根本解」）：
 *   - 解決「寫入後 UI 卡 cache、要硬刷新才看到」的全 SaaS UX 痛點
 *   - 每次寫入完成、自動觸發指定 SWR keys refetch
 *   - 支援 optimistic update（寫入前先更新 UI、失敗自動還原）
 *
 * 用法：
 *   const res = await apiMutate('/api/messaging/conversations/123/reply', {
 *     method: 'POST',
 *     body: { text: 'hi' },
 *     invalidate: [
 *       `/api/messaging/conversations/123/messages`,
 *       `/api/messaging/conversations`,
 *     ],
 *   })
 *   if (!res.ok) toast.error(res.error)
 */

import { mutate as globalMutate } from 'swr'
import { logger } from '@/lib/utils/logger'

export interface ApiMutateOptions {
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  /** 完成後要觸發 refetch 的 SWR keys（globalMutate 自動 revalidate） */
  invalidate?: string[]
  /**
   * Optimistic updates：寫入前先更新 cache、失敗自動還原。
   * key = SWR key、updater 拿到當前 cache 值、回傳新值（不 revalidate、寫入失敗會 rollback）。
   */
  optimistic?: Array<{ key: string; updater: (current: unknown) => unknown }>
}

export interface ApiMutateResult<T> {
  ok: boolean
  data?: T
  error?: string
  status: number
}

/**
 * 寫入 API + 完成後 SWR cache invalidation。
 *
 * - 失敗 → 不 throw、回 { ok: false, error }（caller 用 toast 顯示）
 * - 成功 → 觸發 invalidate 所有指定 keys 重新 fetch
 * - 有 optimistic → 寫入前更新 cache、失敗自動 rollback
 */
export async function apiMutate<T = unknown>(
  url: string,
  options: ApiMutateOptions = {}
): Promise<ApiMutateResult<T>> {
  const {
    method = 'POST',
    body,
    headers,
    invalidate = [],
    optimistic = [],
  } = options

  // 1. Optimistic update：寫入 cache、不 revalidate（避免立刻被 server 覆蓋）
  for (const o of optimistic) {
    await globalMutate(o.key, o.updater, { revalidate: false })
  }

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    let data: T | undefined
    if (text) {
      try {
        data = JSON.parse(text) as T
      } catch {
        // 非 JSON 回應、忽略 parse error
      }
    }

    if (!res.ok) {
      // 失敗：rollback optimistic（revalidate 拉真實狀態）
      for (const o of optimistic) {
        await globalMutate(o.key)
      }
      const errMsg =
        data && typeof data === 'object' && data !== null && 'error' in data
          ? String((data as Record<string, unknown>).error)
          : `HTTP ${res.status}`
      return { ok: false, error: errMsg, status: res.status, data }
    }

    // 成功：invalidate 觸發 refetch、UI 立即生效
    await Promise.all(invalidate.map(key => globalMutate(key)))

    return { ok: true, data, status: res.status }
  } catch (err) {
    // 網路錯誤：rollback optimistic
    for (const o of optimistic) {
      await globalMutate(o.key)
    }
    logger.error('apiMutate failed', err, { url, method })
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'network error',
      status: 0,
    }
  }
}
