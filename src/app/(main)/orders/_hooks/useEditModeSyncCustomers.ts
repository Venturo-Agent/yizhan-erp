/**
 * useEditModeSyncCustomers — 全部編輯模式開關
 *
 * 從 OrderMembersExpandable 拆出，純 UI 開關 hook。
 *
 * 2026-05-26 重設計：拿掉「關閉編輯模式自動建顧客」。
 * 原因：此自動觸發是福岡團 320 張空白重複顧客卡的元兇（每貼一輪名單、關一次編輯模式就重建全團）。
 * 關閉編輯模式 = 純粹關閉，對顧客零動作。建/連顧客一律走「單筆驗證」或「比對顧客」兩個明確入口。
 */

import { useState, useCallback } from 'react'

export function useEditModeSyncCustomers() {
  const [isAllEditMode, setIsAllEditMode] = useState(false)

  const handleToggleEditMode = useCallback(() => {
    // 純切換開關，不對顧客做任何動作
    setIsAllEditMode(prev => !prev)
  }, [])

  return { isAllEditMode, handleToggleEditMode }
}
