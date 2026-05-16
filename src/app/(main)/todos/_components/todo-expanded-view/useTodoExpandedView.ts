'use client'

import { useState, useCallback } from 'react'
import { generateUUID } from '@/lib/utils/uuid'
import type { QuickActionInstance, QuickActionType } from './types'

/**
 * 管理 quick-actions 下方堆疊。點按鈕追加一張卡、可獨立移除。
 * 提交後保留卡片、不關 dialog、可同時對照新建跟舊單。
 */
export function useTodoExpandedView() {
  const [instances, setInstances] = useState<QuickActionInstance[]>([])

  const addInstance = useCallback((type: QuickActionType) => {
    setInstances(prev => [...prev, { id: generateUUID(), type }])
  }, [])

  const removeInstance = useCallback((id: string) => {
    setInstances(prev => prev.filter(i => i.id !== id))
  }, [])

  return { instances, addInstance, removeInstance }
}
