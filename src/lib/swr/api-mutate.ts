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

import { mutate as globalMutate } from './scoped-mutate'
import { logger } from '@/lib/utils/logger'

export interface ApiMutateOptions {
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /**
   * FormData 上傳（OCR / 護照 / 頭像 / 圖片）。
   * 提供後自動跳過 Content-Type header（瀏覽器自動補 multipart boundary）。
   * body 與 formData 擇一使用；兩者同時存在時 formData 優先。
   */
  formData?: FormData
  headers?: Record<string, string>
  /** 完成後要觸發 refetch 的 SWR keys（globalMutate 自動 revalidate） */
  invalidate?: string[]
  /**
   * Optimistic updates：寫入前先更新 cache、失敗自動還原。
   * key = SWR key、updater 拿到當前 cache 值、回傳新值（不 revalidate、寫入失敗會 rollback）。
   */
  optimistic?: Array<{ key: string; updater: (current: unknown) => unknown }>
  /**
   * 回傳 Blob（圖片下載 / 檔案下載）。
   * true 時 data 型別為 Blob、不嘗試 JSON.parse。
   */
  blob?: boolean
  /**
   * 以 response body 的 .success 旗標判斷成功（部分舊 API 回傳 { success: boolean }）。
   * true 時：res.ok && data?.success === true 才算成功；data?.success === false 走 error 路徑。
   */
  successFlag?: boolean
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
    formData,
    headers,
    invalidate = [],
    optimistic = [],
    blob: returnBlob = false,
    successFlag = false,
  } = options

  // 1. Optimistic update：寫入 cache、不 revalidate（避免立刻被 server 覆蓋）
  for (const o of optimistic) {
    await globalMutate(o.key, o.updater, { revalidate: false })
  }

  try {
    // FormData 上傳不設 Content-Type（瀏覽器自動補 multipart boundary）
    const isFormData = formData !== undefined
    const fetchHeaders: Record<string, string> = isFormData
      ? { ...headers }
      : { 'Content-Type': 'application/json', ...headers }

    const fetchBody = isFormData
      ? formData
      : body !== undefined
        ? JSON.stringify(body)
        : undefined

    const res = await fetch(url, {
      method,
      headers: fetchHeaders,
      body: fetchBody,
    })

    // Blob 回應（圖片 / 檔案下載）
    if (returnBlob) {
      if (!res.ok) {
        for (const o of optimistic) { await globalMutate(o.key) }
        return { ok: false, error: `HTTP ${res.status}`, status: res.status }
      }
      const blobData = await res.blob()
      await Promise.all(invalidate.map(key => globalMutate(key)))
      return { ok: true, data: blobData as T, status: res.status }
    }

    const text = await res.text()
    let data: T | undefined
    if (text) {
      try {
        data = JSON.parse(text) as T
      } catch {
        // 非 JSON 回應、忽略 parse error
      }
    }

    // 失敗判斷：HTTP 狀態 + successFlag 模式
    const isSuccess = res.ok && (
      !successFlag ||
      (data && typeof data === 'object' && (data as Record<string, unknown>).success === true)
    )

    if (!isSuccess) {
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
