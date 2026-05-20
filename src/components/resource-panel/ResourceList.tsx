'use client'

import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createAttraction, createHotel, createRestaurant } from '@/data'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { translateDbError } from '@/lib/db-error-translate'
import { DraggableResourceCard } from './DraggableResourceCard'
import { ResourceItem, ResourceType } from './types'

interface ResourceListProps {
  activeTab: ResourceType
  filteredResources: ResourceItem[]
  loading: boolean
  isSearching: boolean
  searchQuery: string
  isCreating: boolean
  resolvedCountryId: string | undefined
  countryId: string | undefined
  onEdit: (resource: ResourceItem) => void
  onCreatingChange: (creating: boolean) => void
}

// 共用：依 tab 選對應 entity hook create
async function createByType(
  type: ResourceType,
  payload: Record<string, unknown>
): Promise<{ id: string; name: string }> {
  // entity hook 的 create signature 用 Attraction 型別、
  // attractions / hotels / restaurants 三表共用同一 type、欄位差異由 caller 控
  if (type === 'attraction') {
    const row = await createAttraction(payload as never)
    return { id: row.id, name: row.name }
  }
  if (type === 'hotel') {
    const row = await createHotel(payload as never)
    return { id: row.id, name: row.name }
  }
  const row = await createRestaurant(payload as never)
  return { id: row.id, name: row.name }
}

export function ResourceList({
  activeTab,
  filteredResources,
  loading,
  isSearching,
  searchQuery,
  isCreating,
  resolvedCountryId,
  countryId,
  onEdit,
  onCreatingChange,
}: ResourceListProps) {
  // Phase A.6（5/20）：根治版本
  // 改用 entity hook 的 createAttraction / createHotel / createRestaurant、內建 invalidate
  // 不再 raw supabase.from().insert()、不再 onNewItem push local state
  // 紅線 F：寫入後 SWR cache 真的失效 → ResourcePanel + library/attractions 列表 + 其他 caller 同步更新
  const handleCreate = async () => {
    if (isCreating) return
    onCreatingChange(true)

    try {
      const trimmed = searchQuery.trim()
      if (!trimmed) return

      const countryIdToUse = resolvedCountryId || countryId
      if (!countryIdToUse) {
        toast.error('缺少國家資訊')
        return
      }

      // 預設分類
      const DEFAULT_CATEGORY: Record<string, string> = {
        attraction: '景點 / Attraction',
        hotel: '飯店 / Hotel',
        restaurant: '餐廳 / Restaurant',
      }

      const insertData: Record<string, unknown> = {
        name: trimmed,
        country_id: countryIdToUse,
        category: DEFAULT_CATEGORY[activeTab] || null,
        data_verified: false,
        is_active: true,
        display_order: 0,
      }

      // hotel / restaurant 預填 city_id（跟舊行為對齊、避免 schema NOT NULL 撞 23502）
      if (activeTab !== 'attraction') {
        const { data: cities } = await supabase
          .from('cities')
          .select('id')
          .eq('country_id', countryIdToUse)
          .limit(1)

        if (cities && cities.length > 0) {
          insertData.city_id = cities[0].id
        }
      }

      try {
        const created = await createByType(activeTab, insertData)
        // entity hook create 內建 invalidate、entity items 變動會自動觸發
        // useResourceSearch 重撈（綁在 entityItems deps）、不再手動接線
        toast.success(`已新增「${created.name}」`)
      } catch (dbError: unknown) {
        const translated = translateDbError(dbError as { code?: string; message?: string })
        toast.error(translated.message)
        return
      }
    } catch (err) {
      logger.error('[ResourceList] 建立失敗:', err)
    } finally {
      onCreatingChange(false)
    }
  }

  // 只在「還沒有任何結果」時顯示 loading spinner
  // 已有結果就保留、refresh 時不再轉圈（避免「新增成功 toast → 又轉圈 → 結果」的中間態）
  if ((loading || isSearching) && filteredResources.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size="1.25em" className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (filteredResources.length === 0 && !searchQuery) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">尚無資料</p>
      </div>
    )
  }

  return (
    <div>
      {filteredResources.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">
            找不到「{searchQuery}」
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {filteredResources.map(resource => (
            <DraggableResourceCard
              key={`${resource.type}-${resource.id}`}
              resource={resource}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}

      {/* 搜尋時永遠顯示新增按鈕 */}
      {searchQuery.trim() && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <button
            disabled={isCreating}
            onClick={handleCreate}
            className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-morandi-gold hover:bg-morandi-gold/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? <Loader2 size="0.875em" className="animate-spin" /> : <Plus size="0.875em" />}
            {isCreating ? '建立中...' : `新增「${searchQuery}」`}
          </button>
        </div>
      )}
    </div>
  )
}
