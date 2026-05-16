'use client'
/**
 * useDirtyCheck — 通用表單 dirty 狀態追蹤 Hook
 *
 * 比 useDirtyState 更細：追蹤「整個值物件」的變化、
 * 透過 JSON 深比對判斷是否跟初始值不同。
 *
 * 適合場景：
 * - 表單一次管理多個欄位（傳整個 formData 物件）
 * - 需要「reset 回初始值」或「切換 base」的場景
 *
 * 相對的，useDirtyState（在 managed-dialog.tsx）是更輕量的布林旗標版本。
 *
 * @example
 * ```tsx
 * const { current, isDirty, update, reset } = useDirtyCheck(initialFormData)
 *
 * // 更新值（自動比對、設 dirty）
 * update({ ...current, name: e.target.value })
 *
 * // 提交後 reset（base 改為最新儲存的值）
 * await save(current)
 * reset(current)
 * ```
 */
import { useState, useCallback, useRef } from 'react'

export function useDirtyCheck<T>(initialValue: T) {
  const originalRef = useRef<T>(initialValue)
  const [current, setCurrent] = useState<T>(initialValue)
  const [isDirty, setIsDirty] = useState(false)

  const update = useCallback((newValue: T) => {
    setCurrent(newValue)
    setIsDirty(JSON.stringify(newValue) !== JSON.stringify(originalRef.current))
  }, [])

  const reset = useCallback((newBase?: T) => {
    const base = newBase ?? originalRef.current
    originalRef.current = base
    setCurrent(base)
    setIsDirty(false)
  }, [])

  return { current, isDirty, update, reset }
}
