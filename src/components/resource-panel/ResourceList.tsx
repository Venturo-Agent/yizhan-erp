'use client'

import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
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
  onNewItem: (item: ResourceItem) => void
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
  onNewItem,
}: ResourceListProps) {
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

      const workspaceId = (await supabase.auth.getUser()).data.user?.user_metadata?.workspace_id
      if (!workspaceId) {
        toast.error('未登入或缺少 workspace')
        return
      }

      const TABLE_MAP = {
        attraction: 'attractions',
        hotel: 'hotels',
        restaurant: 'restaurants',
      }
      const table = TABLE_MAP[activeTab]

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
      }

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

      const { data, error: dbError } = await supabase
        .from(table as 'attractions')
        .insert(insertData as never)
        .select('id, name')
        .single()

      if (dbError) {
        toast.error(translateDbError(dbError).message)
        return
      }

      const newItem: ResourceItem = {
        id: (data as unknown as Record<string, unknown>).id as string,
        name: (data as unknown as Record<string, unknown>).name as string,
        type: activeTab,
        category: '',
        data_verified: false,
      }
      onNewItem(newItem)
    } catch (err) {
      logger.error('[ResourceList] 建立失敗:', err)
    } finally {
      onCreatingChange(false)
    }
  }

  if (loading || isSearching) {
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
