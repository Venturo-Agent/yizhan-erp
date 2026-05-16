'use client'

import { useEffect, useRef } from 'react'

/**
 * Tab 切換時自動觸發重設邏輯的 hook。
 * 使用情境：同一個 Dialog 有多個 Tab（例如「團體 / 公司」收款），
 * 切 tab 時應該清空前一個 tab 的殘留資料，避免送出時帶到不該帶的欄位。
 *
 * @param activeTab 目前 tab 值
 * @param reset 切 tab 時要執行的動作（通常是 resetForm）
 * @param enabled 停用開關（例如編輯模式時不清空）
 */
export function useResetOnTabChange(activeTab: string, reset: () => void, enabled = true) {
  const prevTabRef = useRef(activeTab)

  useEffect(() => {
    if (!enabled) {
      prevTabRef.current = activeTab
      return
    }
    if (prevTabRef.current !== activeTab) {
      reset()
      prevTabRef.current = activeTab
    }
  }, [activeTab, reset, enabled])
}
