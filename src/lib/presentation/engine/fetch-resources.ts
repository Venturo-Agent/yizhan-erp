/**
 * fetch-resources.ts
 * 根據 resource_id 抓取 attractions / hotels / restaurants 的圖片
 *
 * 圖片存放：
 * - Storage bucket: resources/
 * - 結構：attractions/{id}/, hotels/{id}/, restaurants/{id}/
 * - DB 欄位：images: string[]（第一張為封面）
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export type ResourceType = 'attraction' | 'hotel' | 'restaurant'

interface ResourceImages {
  resourceId: string
  resourceType: ResourceType
  images: string[]
  /** 封面圖（第一張） */
  coverImage: string | null
}

/**
 * 根據 resourceId + type 抓圖片列表
 *
 * 飯店 / 餐廳 / 景點 的多圖都存在 resources.images[]
 * 這裡只取第一張當作 PPTX 的主圖
 */
export async function fetchResourceImages(
  resourceId: string,
  resourceType: ResourceType
): Promise<ResourceImages> {
  const supabase = getSupabaseAdminClient()
  const table = getTableName(resourceType)

  const { data, error } = await supabase.from(table).select('images').eq('id', resourceId).single()

  if (error || !data) {
    return { resourceId, resourceType, images: [], coverImage: null }
  }

  const images = (data.images as string[]) || []
  return {
    resourceId,
    resourceType,
    images,
    coverImage: images[0] ?? null,
  }
}

/**
 * 批量抓取多個 resource 的圖片
 * 用於 route_card.attractions[] / restaurant[] 等場景
 */
export async function batchFetchResourceImages(
  items: Array<{ resourceId: string; resourceType: ResourceType }>
): Promise<Map<string, ResourceImages>> {
  const results = await Promise.all(
    items.map(item => fetchResourceImages(item.resourceId, item.resourceType))
  )
  return new Map(results.map(r => [r.resourceId, r]))
}

// ============================================
// 輔助：對應 resource_type → DB table 名稱
// ============================================

function getTableName(type: ResourceType): 'attractions' | 'hotels' | 'restaurants' {
  switch (type) {
    case 'attraction':
      return 'attractions'
    case 'hotel':
      return 'hotels'
    case 'restaurant':
      return 'restaurants'
  }
}

/**
 * 從 CanvasImage.url 解析出 resourceId + resourceType
 * 用於 block.data.image?.url（格式如 https://xxx.supabase.co/storage/v1/object/public/resources/hotels/uuid/xxx.jpg）
 *
 * 注意：CanvasImage.url 可能直接是完整 URL，也可能需要另外 fetch
 */
export function parseResourceInfoFromUrl(url: string): {
  resourceId: string
  resourceType: ResourceType
} | null {
  if (!url) return null

  // 解析格式：.../resources/{type}s/{resourceId}/...
  const match = url.match(/\/resources\/(attractions|hotels|restaurants)\/([^/]+)\//)
  if (!match) return null

  const resourceType = match[1] as ResourceType
  // 統一 conversion：attractions → attraction 等
  const normalizedType = resourceType.replace(/s$/, '') as ResourceType

  return {
    resourceId: match[2],
    resourceType: normalizedType,
  }
}

/**
 * 取得圖片 URL（帶裁切參數）
 * CanvasImage 有 focal_x/focal_y 可計算 object-position
 * 目前 PptxGenJS 圖片 API 有限，這裡只回傳 URL、裁切資訊在 render 時處理
 */
export function getImageUrlWithFocal(
  imageUrl: string,
  focal?: { focal_x?: number; focal_y?: number }
): string {
  // 暫時直接回傳 URL
  // 未來可擴展：支援 Supabase Image Transform API
  return imageUrl
}
