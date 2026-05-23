'use client'

/**
 * 展示行程 Canvas API wrapper
 *
 * 為什麼包這層：
 * - 集中錯誤訊息解析（API 回 { error: '...' }）
 * - 之後 API 換 path / shape、只動這一檔
 * - 失敗統一拋 Error、外面 catch 一次 toast
 *
 * 對應 API：
 *   GET    /api/tours/[code]/display-canvas
 *   PUT    /api/tours/[code]/display-canvas
 *   POST   /api/tours/[code]/display-canvas/publish
 *   POST   /api/tours/[code]/display-canvas/unpublish
 */

import type { Canvas } from '@/components/canvas-renderer/types'

export interface DisplayCanvasResponse {
  // 草稿 canvas（沒編輯過會是 null）
  canvas: Canvas | null
  theme: 'yongcheng'
  published: boolean
  // 客人實際看到的版本（snapshot）
  published_canvas: Canvas | null
  published_at: string | null
  updated_at: string | null
}

interface ApiErrorBody {
  error?: string
}

/**
 * 統一 fetch 包裝：失敗時把 API 的 error message 抽出來丟 Error、外面 toast
 */
async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    try {
      const body = (await res.json()) as ApiErrorBody
      if (body?.error) message = body.error
    } catch {
      // 不是 JSON、保留 status text
    }
    throw new Error(message)
  }

  return (await res.json()) as T
}

/**
 * GET 草稿 canvas
 *
 * 為什麼回傳 canvas 可能是 null：
 *   業務還沒編輯過該團、tour_display_overrides 沒 row、API 直接回 canvas: null。
 *   呼叫端要 fallback 走 buildCanvasFromTour() 從來源資料自動生成。
 */
export function fetchDisplayCanvas(code: string): Promise<DisplayCanvasResponse> {
  return apiFetch<DisplayCanvasResponse>(
    `/api/tours/${encodeURIComponent(code)}/display-canvas`,
    { method: 'GET', cache: 'no-store' }
  )
}

export interface PutDisplayCanvasResponse {
  ok: true
  updated_at: string
}

/**
 * PUT 草稿 canvas（不影響已發布版本）
 */
export function putDisplayCanvas(
  code: string,
  canvas: Canvas
): Promise<PutDisplayCanvasResponse> {
  return apiFetch<PutDisplayCanvasResponse>(
    `/api/tours/${encodeURIComponent(code)}/display-canvas`,
    {
      method: 'PUT',
      body: JSON.stringify({ canvas, theme: 'yongcheng' }),
    }
  )
}

export interface PublishResponse {
  ok: true
  published: boolean
  published_at: string | null
}

export function publishDisplayCanvas(code: string): Promise<PublishResponse> {
  return apiFetch<PublishResponse>(
    `/api/tours/${encodeURIComponent(code)}/display-canvas/publish`,
    { method: 'POST' }
  )
}

export function unpublishDisplayCanvas(code: string): Promise<PublishResponse> {
  return apiFetch<PublishResponse>(
    `/api/tours/${encodeURIComponent(code)}/display-canvas/unpublish`,
    { method: 'POST' }
  )
}
