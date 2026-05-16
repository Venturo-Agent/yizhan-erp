/**
 * Venturo ERP 統一資料層
 *
 * 使用方式：
 * ```typescript
 * import { useTours, useOrder, createTour } from '@/data'
 *
 * // 列表
 * const { items: tours, loading } = useTours()
 *
 * // 單筆（skip pattern）
 * const { item: tour } = useTour(tourId)  // tourId = null 時不發請求
 *
 * // 分頁
 * const { items, totalCount } = useToursPaginated({
 *   page: 1,
 *   pageSize: 20,
 *   filter: { status: 'confirmed' },
 *   search: 'keyword',
 *   searchFields: ['name', 'code'],
 * })
 *
 * // Dictionary（O(1) 查詢）
 * const { get } = useTourDictionary()
 * const tourName = get(tourId)?.name
 *
 * // CRUD
 * await createTour({ name: 'New Tour', ... })
 * await updateTour(id, { name: 'Updated' })
 * await deleteTour(id)
 * ```
 */

// ============================================
// Entities
// ============================================

export * from './entities'

// ============================================
// Core（進階使用：自訂 entity）
// ============================================




