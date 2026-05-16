/**
 * ImageEditor adjustments 偏好持久化（localStorage）
 *
 * 記住 user 上次調的色彩設定（exposure / contrast / highlights ...）。
 * 旋轉 / 縮放 / 位置不記憶（這些是針對單張圖、不該跨圖延續）。
 *
 * key 含 v1 是為了未來 schema 變動時可以 invalidate 舊資料。
 */

import { type ImageAdjustments, DEFAULT_ADJUSTMENTS } from './types'

const STORAGE_KEY = 'image-editor.adjustments.v1'

export function loadStoredAdjustments(): ImageAdjustments | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ImageAdjustments>
    return { ...DEFAULT_ADJUSTMENTS, ...parsed }
  } catch {
    return null
  }
}

export function saveStoredAdjustments(adjustments: ImageAdjustments): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(adjustments))
  } catch {
    // localStorage 寫不進去（譬如 quota / 隱私模式）— 靜默失敗
  }
}

export function clearStoredAdjustments(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
