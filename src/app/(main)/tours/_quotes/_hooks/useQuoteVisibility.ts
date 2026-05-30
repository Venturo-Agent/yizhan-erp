'use client'

/**
 * useQuoteVisibility
 * 管理報價單項目顯示/隱藏（show_on_quote）
 */

import { useCallback } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { CostCategory } from '@/app/(main)/tours/_quotes/_types'

const UPDATE_DISPLAY_STATUS_FAILED = '更新顯示狀態失敗'

interface UseQuoteVisibilityOptions {
  categories: CostCategory[]
  setCategories: React.Dispatch<React.SetStateAction<CostCategory[]>>
  refreshCoreItems: () => void
}

export function useQuoteVisibility({
  categories,
  setCategories,
  refreshCoreItems,
}: UseQuoteVisibilityOptions) {
  const handleToggleVisibility = useCallback(
    async (categoryId: string, itemId: string) => {
      const category = categories.find(c => c.id === categoryId)
      if (!category) return
      let item = category.items.find(i => i.id === itemId)
      let currentlyVisible = true
      if (!item) {
        item = category.hiddenItems?.find(i => i.id === itemId)
        currentlyVisible = false
      }
      if (!item?.itinerary_item_id) return
      const newVisibility = !currentlyVisible
      const { error } = await supabase
        .from('tour_itinerary_items')
        .update({ show_on_quote: newVisibility })
        .eq('id', item.itinerary_item_id)
      if (error) {
        toast.error(UPDATE_DISPLAY_STATUS_FAILED)
        return
      }
      setCategories(prev =>
        prev.map(cat => {
          if (cat.id !== categoryId) return cat
          if (newVisibility) {
            const restoredItem = cat.hiddenItems?.find(i => i.id === itemId)
            return {
              ...cat,
              items: restoredItem ? [...cat.items, restoredItem] : cat.items,
              hiddenItems: cat.hiddenItems?.filter(i => i.id !== itemId),
              total: cat.items.reduce((sum, i) => sum + i.total, 0) + (restoredItem?.total || 0),
            }
          } else {
            const hiddenItem = cat.items.find(i => i.id === itemId)
            return {
              ...cat,
              items: cat.items.filter(i => i.id !== itemId),
              hiddenItems: [
                ...(cat.hiddenItems || []),
                ...(hiddenItem ? [{ ...hiddenItem, show_on_quote: false }] : []),
              ],
              total: cat.items.filter(i => i.id !== itemId).reduce((sum, i) => sum + i.total, 0),
            }
          }
        })
      )
      refreshCoreItems()
      toast.success(newVisibility ? '已恢復顯示' : '已隱藏')
    },
    [categories, setCategories, refreshCoreItems]
  )

  return { handleToggleVisibility }
}
