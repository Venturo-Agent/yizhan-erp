'use client'

import { useState, useEffect } from 'react'
import type { WidgetType } from '../_types'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { saveWidgetPreferences } from '@/app/(main)/dashboard/_services/dashboard.service'

const STORAGE_KEY = 'homepage-widgets'
const PREFERENCE_KEY = 'homepage-widgets-order'
const DEFAULT_WIDGETS: WidgetType[] = ['calculator', 'notes']

export function useWidgets() {
  const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>(DEFAULT_WIDGETS)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuthStore()

  // 從 Supabase 載入設定
  useEffect(() => {
    async function loadPreferences() {
      if (typeof window === 'undefined' || !user?.id) {
        // 沒有登入用戶時，使用 localStorage
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          setActiveWidgets(JSON.parse(saved))
        }
        setIsLoading(false)
        return
      }

      try {
        // 從 Supabase 讀取用戶偏好
        const { data, error } = await supabase
          .from('user_preferences')
          .select('preference_value')
          .eq('user_id', user.id)
          .eq('preference_key', PREFERENCE_KEY)
          .maybeSingle()

        if (error) {
          // Fallback to localStorage
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved) {
            setActiveWidgets(JSON.parse(saved))
          }
        } else if (data?.preference_value) {
          setActiveWidgets(data.preference_value as WidgetType[])
          // 同步到 localStorage 作為備份
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.preference_value))
        }
      } catch {
        // Error loading widget preferences - fallback to localStorage
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          setActiveWidgets(JSON.parse(saved))
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadPreferences()
  }, [user?.id])

  // 儲存到 Supabase 和 localStorage
  const saveWidgets = async (widgets: WidgetType[]) => {
    setActiveWidgets(widgets)

    // 總是保存到 localStorage 作為備份
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets))
    }

    // 如果有登入用戶，保存到 Supabase
    if (user?.id) {
      try {
        await saveWidgetPreferences(user.id, PREFERENCE_KEY, widgets as string[]).catch(err => {
          logger.warn('[useWidgets] Failed to save to Supabase:', err.message)
        })
      } catch (error) {
        logger.warn('[useWidgets] Error saving widget preferences:', error)
      }
    }
  }

  // 切換小工具
  const toggleWidget = (widgetId: WidgetType) => {
    const newWidgets = activeWidgets.includes(widgetId)
      ? activeWidgets.filter(id => id !== widgetId)
      : [...activeWidgets, widgetId]
    saveWidgets(newWidgets)
  }

  // 重新排序小工具
  const reorderWidgets = (oldIndex: number, newIndex: number) => {
    const newWidgets = [...activeWidgets]
    const [removed] = newWidgets.splice(oldIndex, 1)
    newWidgets.splice(newIndex, 0, removed)
    saveWidgets(newWidgets)
  }

  return {
    activeWidgets,
    toggleWidget,
    reorderWidgets,
    isLoading,
  }
}
