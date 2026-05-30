/**
 * filter-blocks.ts
 * 卡片過濾邏輯 — 根據內容是否有意義來決定是否渲染
 *
 * 規則：
 * - 景點：有 title 就顯示
 * - 餐廳：無 image + 無 description → 跳過（如飛機餐）
 * - 飯店：無 image → 跳過
 * - spotlight：有 image 或有 lead → 顯示
 */

import type {
  CanvasRouteCardBlock,
  CanvasRestaurantCardBlock,
  CanvasHotelCardBlock,
  CanvasSpotlightBlock,
  CanvasSequenceStepsBlock,
  CanvasAttraction,
} from '@/components/canvas-renderer/types'

// ============================================
// Attraction（景點）
// ============================================

export interface FilteredAttraction extends CanvasAttraction {
  /** 是否值得展示（有圖或有內容） */
  worthShowing: boolean
}

/**
 * 景點過濾：只要有 title 就顯示
 * image?.url 只是視覺豐富度，不影響是否顯示
 */
export function filterAttraction(a: CanvasAttraction): FilteredAttraction {
  return {
    ...a,
    worthShowing: Boolean(a.name?.trim()),
  }
}

// ============================================
// Restaurant（餐廳）
// ============================================

export interface FilteredRestaurant {
  block: CanvasRestaurantCardBlock
  /** 是否值得展示 */
  worthShowing: boolean
  reason?: 'has-image-desc' | 'has-image-only' | 'has-desc-only' | 'skipped-no-content'
}

/**
 * 餐廳過濾邏輯：
 * - 無 image + 無 description → 跳過（如飛機餐、機上餐）
 * - 有 image + 有 description → 完整展示
 * - 有 image、無 description → 圖+標題
 * - 無 image、有 description → 純文字介紹
 */
export function filterRestaurant(card: CanvasRestaurantCardBlock): FilteredRestaurant {
  const { data } = card
  const hasImage = Boolean(data.image?.url)
  const hasDesc = Boolean(data.description?.trim())

  if (!hasImage && !hasDesc) {
    return { block: card, worthShowing: false, reason: 'skipped-no-content' }
  }
  if (hasImage && hasDesc) {
    return { block: card, worthShowing: true, reason: 'has-image-desc' }
  }
  if (hasImage && !hasDesc) {
    return { block: card, worthShowing: true, reason: 'has-image-only' }
  }
  return { block: card, worthShowing: true, reason: 'has-desc-only' }
}

// ============================================
// Hotel（飯店）
// ============================================

export interface FilteredHotel {
  block: CanvasHotelCardBlock
  /** 是否值得展示 */
  worthShowing: boolean
  reason?: 'has-image' | 'skipped-no-image'
}

/**
 * 飯店過濾邏輯：
 * - 無 image → 跳過（只有名稱無意義）
 * - 有 image → 顯示，取 images[0] 當主圖
 *
 * 注意：飯店多圖存在 resources.images[]，需另外 fetch
 * 這裡只處理 CanvasHotelCardBlock.image（单张）
 */
export function filterHotel(card: CanvasHotelCardBlock): FilteredHotel {
  const hasImage = Boolean(card.data.image?.url)

  if (!hasImage) {
    return { block: card, worthShowing: false, reason: 'skipped-no-image' }
  }
  return { block: card, worthShowing: true, reason: 'has-image' }
}

// ============================================
// Spotlight（亮點）
// ============================================

export interface FilteredSpotlight {
  block: CanvasSpotlightBlock
  worthShowing: boolean
}

/**
 * Spotlight 過濾：有 image 或有 lead 才顯示
 * 如果都沒有，放出來也沒內容
 */
export function filterSpotlight(card: CanvasSpotlightBlock): FilteredSpotlight {
  const hasImage = Boolean(card.data.image?.url)
  const hasLead = Boolean(card.data.lead?.trim())

  return {
    block: card,
    worthShowing: hasImage || hasLead,
  }
}

// ============================================
// Sequence Steps（時間軸）
// ============================================

export interface FilteredSequenceSteps {
  block: CanvasSequenceStepsBlock
  worthShowing: boolean
}

/**
 * Sequence Steps 過濾：有 steps 內容才顯示
 */
export function filterSequenceSteps(card: CanvasSequenceStepsBlock): FilteredSequenceSteps {
  const hasSteps = (card.data.steps?.length ?? 0) > 0
  return {
    block: card,
    worthShowing: hasSteps,
  }
}

// ============================================
// Route Card（景點卡包）
// ============================================

export interface FilteredRouteCard {
  block: CanvasRouteCardBlock
  /** 過濾後的景點列表 */
  attractions: FilteredAttraction[]
  /** 是否值得展示（起碼有一個景點有意義） */
  worthShowing: boolean
}

/**
 * Route Card 過濾：
 * - 過濾每個 attraction
 * - 如果沒有任何值得展示的 → 跳過整張卡
 */
export function filterRouteCard(card: CanvasRouteCardBlock): FilteredRouteCard {
  const filtered = card.data.attractions.map(filterAttraction)
  const worthShowing = filtered.some(a => a.worthShowing)

  return {
    block: card,
    attractions: filtered,
    worthShowing,
  }
}
