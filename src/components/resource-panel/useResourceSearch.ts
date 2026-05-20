'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { ResourceItem, ResourceType } from './types'

interface UseResourceSearchOptions {
  searchQuery: string
  activeTab: ResourceType
  resolvedCountryId: string | undefined
  // 把當前 tab 的 entity hook items 當依賴：items 變動（新增/刪除/編輯）
  // 自動觸發搜尋重撈、概念跟主目錄機綁定、不需手動接線
  entityItems?: unknown[]
}

// Phase A.6（5/20）保留 raw query 的理由（紅線 F 例外、有正當理由）：
//
// 「資源主列表」(useAttractions / useHotels / useRestaurants) 已改用 entity hook。
// 此 hook 是「搜尋 only」場景、用 ilike + bigram fallback 模糊匹配中文景點名（譬如
// 搜「大黃」→ 找不到精確匹配 → 退而切 bigram「大黃」「黃蜂」找近似）。
//
// 為什麼不擴 entity hook 支援？
// - entity hook usePaginated 的 search 只做單一 ilike、沒 bigram fallback
// - 加 bigram 進 createEntityHook 會 ripple 全 41 個 entity 的 cache key、風險高
// - 搜尋是 transient query（每個 keyword 不同、不重複命中）、用 SWR cache 反而浪費 key
//
// 收益點：寫入仍走 entity hook 的 createAttraction/Hotel/Restaurant、invalidate 後
// 主列表會 refetch；搜尋結果是「server side query → 暫時 state」、不會跟 SWR cache 撕裂。
export function useResourceSearch({
  searchQuery,
  activeTab,
  resolvedCountryId,
  entityItems,
}: UseResourceSearchOptions) {
  const [searchResults, setSearchResults] = useState<ResourceItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const tableMap = {
          attraction: 'attractions',
          hotel: 'hotels',
          restaurant: 'restaurants',
        } as const
        const table = tableMap[activeTab] as 'attractions' | 'hotels' | 'restaurants'
        const extraSelect = activeTab === 'hotel' ? ', star_rating' : ''
        const selectStr = `id, name, category, images, data_verified, latitude, longitude, address, description, region_id${extraSelect}`

        const trimmed = searchQuery.trim()

        // Step 1: 精確子字串搜尋
        // is_active=true 已自動隱藏軟刪除 row（softDelete helper 同時設 is_active=false）
        let baseQuery = supabase
          .from(table)
          .select(selectStr as 'id, name, category, images')
          .eq('is_active', true)
        if (resolvedCountryId) {
          baseQuery = baseQuery.eq('country_id', resolvedCountryId)
        }

        let query = baseQuery.ilike('name', `%${trimmed}%`)
        let { data, error } = await query.order('name').limit(20)

        // Step 2: 精確搜沒結果 → 用 bigram 模糊搜尋
        if (!error && (!data || data.length === 0) && trimmed.length > 2) {
          const commonWords = [
            '飯店', '餐廳', '酒店', '旅館', '景點', '公園', '神社', '寺廟', '美術', '博物',
          ]
          const bigrams: string[] = []
          for (let i = 0; i <= trimmed.length - 2; i++) {
            const bg = trimmed.substring(i, i + 2)
            if (!commonWords.includes(bg)) {
              bigrams.push(bg)
            }
          }
          if (bigrams.length === 0) {
            bigrams.push(trimmed.substring(0, Math.min(3, trimmed.length)))
          }
          const uniqueBigrams = [...new Set(bigrams)]
          const orFilter = uniqueBigrams.map(bg => `name.ilike.%${bg}%`).join(',')

          let bigramQuery = supabase
            .from(table)
            .select(selectStr as 'id, name, category, images')
            .eq('is_active', true)
            .or(orFilter)
          if (resolvedCountryId) {
            bigramQuery = bigramQuery.eq('country_id', resolvedCountryId)
          }
          const result = await bigramQuery.order('name').limit(20)
          data = result.data
          error = result.error
        }

        if (!error && data) {
          setSearchResults(
            data.map((item: Record<string, unknown>) => ({
              id: item.id as string,
              name: item.name as string,
              type: activeTab,
              category:
                activeTab === 'hotel' && item.star_rating
                  ? `${item.star_rating}星`
                  : (item.category as string | null),
              images: (item.images as string[]) || [],
              data_verified: item.data_verified as boolean | undefined,
              latitude: item.latitude as number | null,
              longitude: item.longitude as number | null,
              address: item.address as string | null,
              description: item.description as string | null,
              region_id: item.region_id as string | null,
            }))
          )
        }
      } catch (err) {
        logger.error('[useResourceSearch] 搜尋失敗:', err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, activeTab, resolvedCountryId, entityItems])

  return { searchResults, isSearching }
}
