/**
 * core-table-adapter — 核心表 ↔ 報價分類 轉換器
 *
 * 將 tour_itinerary_items 核心表項目轉換為報價單的 CostCategory[] 格式
 * 將報價單的修改寫回核心表
 */

import { mutate as globalMutate } from '@/lib/swr/scoped-mutate'
import { invalidate_cache_pattern } from '@/lib/cache/indexeddb-cache'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { TourItineraryItem } from '@/app/(main)/tours/_types/tour-itinerary-item.types'
import type { CostCategory, CostItem } from '../_types'
import { costCategories } from '../_types'

/**
 * 核心表項目 → 報價分類
 *
 * 按 category 分組到 7 個分類，映射欄位名稱
 */
export function coreItemsToCostCategories(items: TourItineraryItem[]): CostCategory[] {
  const dedupedItems = items

  // 深拷貝預設分類結構（確保每個分類都存在）
  const categories: CostCategory[] = costCategories.map(cat => ({
    ...cat,
    items: [],
    total: 0,
  }))

  for (const item of dedupedItems) {
    if (!item.category) continue
    // 隱藏的項目放到 hiddenItems（不在主列表顯示，但可恢復）
    if (item.show_on_quote === false) {
      const targetCategory = categories.find(c => c.id === item.category)
      if (targetCategory) {
        if (!targetCategory.hiddenItems) targetCategory.hiddenItems = []
        targetCategory.hiddenItems.push({
          id: `core-${item.id}`,
          itinerary_item_id: item.id,
          name: item.title || '',
          quantity: null,
          unit_price: null,
          total: 0,
          day: item.day_number ?? undefined,
          sub_category: item.sub_category ?? undefined,
          show_on_quote: false,
        })
      }
      continue
    }

    const targetCategory = categories.find(c => c.id === item.category)
    if (!targetCategory) continue

    const costItem: CostItem = {
      id: `core-${item.id}`,
      itinerary_item_id: item.id,
      name: item.title || '',
      quantity: item.quantity ?? null,
      unit_price: item.unit_price ?? null,
      total: item.total_cost ?? 0,
      note: item.quote_note || '',
      description: item.description || '',
      day: item.day_number ?? undefined,
      pricing_type: (item.pricing_type as CostItem['pricing_type']) ?? undefined,
      adult_price: item.adult_price ?? undefined,
      child_price: item.child_price ?? undefined,
      infant_price: item.infant_price ?? undefined,
      unit_price_formula: (item as unknown as Record<string, unknown>).unit_price_formula as
        | string
        | undefined,
      quantity_formula: (item as unknown as Record<string, unknown>).quantity_formula as
        | string
        | undefined,
      adult_price_formula: (item as unknown as Record<string, unknown>).adult_price_formula as
        | string
        | undefined,
      child_price_formula: (item as unknown as Record<string, unknown>).child_price_formula as
        | string
        | undefined,
      infant_price_formula: (item as unknown as Record<string, unknown>).infant_price_formula as
        | string
        | undefined,
      estimated_cost: item.estimated_cost ?? null,
      quoted_cost: item.quoted_cost ?? null,
      resource_type: item.resource_type as CostItem['resource_type'],
      resource_id: item.resource_id || undefined,
      resource_latitude: item.latitude ?? undefined,
      resource_longitude: item.longitude ?? undefined,
      resource_google_maps_url: item.google_maps_url ?? undefined,
      sub_category: item.sub_category ?? undefined,
      show_on_quote: true, // 這裡的 item 一定是 show_on_quote !== false（false 已在上面分流到 hiddenItems）
    }

    // 住宿：sub_category → room_type
    if (item.category === 'accommodation' && item.sub_category) {
      costItem.room_type = item.sub_category
    }

    // 團體分攤：推斷 is_group_cost
    if (item.category === 'group-transport') {
      costItem.is_group_cost = true
    }
    // 領隊導遊：有數量的才是團體分攤（出差費），無數量的是個人費用（小費）
    if (item.category === 'guide') {
      costItem.is_group_cost = !!(item.quantity && item.quantity > 0)
    }

    targetCategory.items.push(costItem)
  }

  // 住宿：自動標記續住（同一飯店名稱連續天 → is_same_as_previous）
  const accCat = categories.find(c => c.id === 'accommodation')
  if (accCat) {
    const sorted = accCat.items.slice().sort((a, b) => (a.day ?? 0) - (b.day ?? 0))
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].name && sorted[i].name === sorted[i - 1].name) {
        sorted[i].is_same_as_previous = true
      }
    }
    accCat.items = sorted
  }

  // 計算各分類 total
  for (const cat of categories) {
    cat.total = cat.items.reduce((sum, item) => sum + (item.total || 0), 0)
  }

  return categories
}

/**
 * 報價單儲存時，把報價欄位寫回核心表
 *
 * - 有 itinerary_item_id → UPDATE 報價欄位
 * - 無 itinerary_item_id → INSERT 新 row
 * - 核心表有但報價單沒有 → 清除報價欄位或 DELETE
 */
export async function writePricingToCore(
  categories: CostCategory[],
  tour_id: string,
  workspace_id: string,
  coreItems: TourItineraryItem[]
): Promise<{ synced: number; inserted: number; cleared: number }> {
  const result = { synced: 0, inserted: 0, cleared: 0 }
  const currentCoreItemIds = new Set<string>()

  for (const category of categories) {
    for (const item of category.items) {
      if (item.itinerary_item_id) {
        // UPDATE: 已有核心表 row → 更新報價欄位
        // 加 workspace_id filter 當 defense-in-depth（RLS 是第一道）
        currentCoreItemIds.add(item.itinerary_item_id)
        const { error } = await supabase
          .from('tour_itinerary_items')
          .update({
            unit_price: item.unit_price ?? null,
            quantity: item.quantity ?? null,
            total_cost: item.total ?? null,
            pricing_type: item.pricing_type ?? null,
            adult_price: item.adult_price ?? null,
            child_price: item.child_price ?? null,
            infant_price: item.infant_price ?? null,
            unit_price_formula: item.unit_price_formula ?? null,
            quantity_formula: item.quantity_formula ?? null,
            adult_price_formula: item.adult_price_formula ?? null,
            child_price_formula: item.child_price_formula ?? null,
            infant_price_formula: item.infant_price_formula ?? null,
            quote_note: item.note ?? null,
            quote_status: 'drafted',
          })
          .eq('id', item.itinerary_item_id)
          .eq('workspace_id', workspace_id)

        if (error) {
          logger.error('Update core item failed:', { id: item.itinerary_item_id, error })
        } else {
          result.synced++
        }
      } else {
        // INSERT: 報價頁新建的項目 → 插入核心表
        // ⚠️ 住宿類別的新項目不同步到核心表（房型只用於報價，不產生需求單）
        if (category.id === 'accommodation') {
          logger.log('跳過住宿新項目同步（僅報價用）:', { item: item.name, day: item.day })
          continue
        }

        // 防重複：先查核心表有沒有同分類 + 同標題 + 同價格的項目
        const { data: existing } = await supabase
          .from('tour_itinerary_items')
          .select('id')
          .eq('tour_id', tour_id)
          .eq('workspace_id', workspace_id)
          .eq('category', category.id)
          .eq('title', item.name || '')
          .is('itinerary_id', null)
          .limit(1)

        if (existing && existing.length > 0) {
          // 已存在 → UPDATE 而不是 INSERT
          currentCoreItemIds.add(existing[0].id)
          await supabase
            .from('tour_itinerary_items')
            .update({
              unit_price: item.unit_price ?? null,
              quantity: item.quantity ?? null,
              total_cost: item.total ?? null,
              pricing_type: item.pricing_type ?? null,
              adult_price: item.adult_price ?? null,
              child_price: item.child_price ?? null,
              infant_price: item.infant_price ?? null,
              unit_price_formula: item.unit_price_formula ?? null,
              quantity_formula: item.quantity_formula ?? null,
              adult_price_formula: item.adult_price_formula ?? null,
              child_price_formula: item.child_price_formula ?? null,
              infant_price_formula: item.infant_price_formula ?? null,
              quote_note: item.note ?? null,
              quote_status: 'drafted',
            })
            .eq('id', existing[0].id)
            .eq('workspace_id', workspace_id)
          result.synced++
          continue
        }

        const { data, error } = await supabase
          .from('tour_itinerary_items')
          .insert({
            tour_id,
            workspace_id,
            category: category.id,
            title: item.name || null,
            day_number: item.day ?? null,
            sub_category: item.sub_category || item.room_type || null,
            unit_price: item.unit_price ?? null,
            quantity: item.quantity ?? null,
            total_cost: item.total ?? null,
            pricing_type: item.pricing_type ?? null,
            adult_price: item.adult_price ?? null,
            child_price: item.child_price ?? null,
            infant_price: item.infant_price ?? null,
            unit_price_formula: item.unit_price_formula ?? null,
            quantity_formula: item.quantity_formula ?? null,
            adult_price_formula: item.adult_price_formula ?? null,
            child_price_formula: item.child_price_formula ?? null,
            infant_price_formula: item.infant_price_formula ?? null,
            quote_note: item.note ?? null,
            quote_status: 'drafted',
            sort_order: 0,
          })
          .select('id')
          .single()

        if (error) {
          logger.error('Insert core item failed:', {
            category: category.id,
            item: item.name,
            workspace_id,
            tour_id,
            error,
          })
        } else if (data) {
          logger.log('Insert core item success:', {
            category: category.id,
            item: item.name,
            id: data.id,
          })
          result.inserted++
        }
      }
    }
  }

  // Invalidate cache after all updates/inserts
  globalMutate(
    (key: string) => typeof key === 'string' && key.startsWith('entity:tour_itinerary_items')
  )
  invalidate_cache_pattern('entity:tour_itinerary_items')

  // CLEAR / DELETE: 核心表有但報價單沒有的項目
  for (const coreItem of coreItems) {
    if (currentCoreItemIds.has(coreItem.id)) continue

    if (coreItem.itinerary_id) {
      // 行程帶入的項目 → 只清除報價欄位
      if (coreItem.quote_status !== 'none') {
        const { error } = await supabase
          .from('tour_itinerary_items')
          .update({
            unit_price: null,
            quantity: null,
            total_cost: null,
            pricing_type: null,
            adult_price: null,
            child_price: null,
            infant_price: null,
            quote_note: null,
            quote_status: 'none',
          })
          .eq('id', coreItem.id)
          .eq('workspace_id', workspace_id)

        if (!error) result.cleared++
      }
    } else {
      // 報價頁建的項目（無 itinerary_id）→ DELETE row
      const { error } = await supabase
        .from('tour_itinerary_items')
        .delete()
        .eq('id', coreItem.id)
        .eq('workspace_id', workspace_id)

      if (!error) result.cleared++
    }
  }

  return result
}
