/**
 * Canvas（Canvas）展示行程組件 — 公開 API
 *
 * 為什麼集中 export：
 * - 外部 import 只走這支、不要散在多個 path
 * - 換內部結構（e.g. 重命名某 section）不需動 caller
 *
 * 用法：
 *   import { CanvasRenderer } from '@/components/canvas-renderer'
 *   <CanvasRenderer canvas={canvas} />
 */

export { CanvasLayout } from './CanvasLayout'
export { CanvasRenderer } from './CanvasRenderer'

// Sections（編輯器 / 預覽 / 各種拼裝場景可獨立使用）
export { CanvasSidenav } from './sections/CanvasSidenav'
export { CanvasCover } from './sections/CanvasCover'
export { CanvasOverviewTimeline } from './sections/CanvasOverviewTimeline'
export { CanvasDayHeader } from './sections/CanvasDayHeader'
export { CanvasRouteCard } from './sections/CanvasRouteCard'
export { CanvasSequenceSteps } from './sections/CanvasSequenceSteps'
export { CanvasHotelCard } from './sections/CanvasHotelCard'
export { CanvasFlightCard } from './sections/CanvasFlightCard'
export { CanvasRestaurantCard } from './sections/CanvasRestaurantCard'
export { CanvasSpotlight } from './sections/CanvasSpotlight'
export { CanvasJpNote } from './sections/CanvasJpNote'
export { CanvasStaysSection } from './sections/CanvasStaysSection'
export { CanvasAppendix } from './sections/CanvasAppendix'

// Tokens / Types（給編輯器 / 資料層用）
export * from './tokens'
export type * from './types'
