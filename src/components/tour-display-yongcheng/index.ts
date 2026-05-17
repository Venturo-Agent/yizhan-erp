/**
 * 永成款（Yongcheng）展示行程組件 — 公開 API
 *
 * 為什麼集中 export：
 * - 外部 import 只走這支、不要散在多個 path
 * - 換內部結構（e.g. 重命名某 section）不需動 caller
 *
 * 用法：
 *   import { YongchengRenderer } from '@/components/tour-display-yongcheng'
 *   <YongchengRenderer canvas={canvas} />
 */

export { YongchengLayout } from './YongchengLayout'
export { YongchengRenderer } from './YongchengRenderer'

// Sections（編輯器 / 預覽 / 各種拼裝場景可獨立使用）
export { YongchengSidenav } from './sections/YongchengSidenav'
export { YongchengCover } from './sections/YongchengCover'
export { YongchengOverviewTimeline } from './sections/YongchengOverviewTimeline'
export { YongchengDayHeader } from './sections/YongchengDayHeader'
export { YongchengRouteCard } from './sections/YongchengRouteCard'
export { YongchengSequenceSteps } from './sections/YongchengSequenceSteps'
export { YongchengHotelCard } from './sections/YongchengHotelCard'
export { YongchengFlightCard } from './sections/YongchengFlightCard'
export { YongchengRestaurantCard } from './sections/YongchengRestaurantCard'
export { YongchengSpotlight } from './sections/YongchengSpotlight'
export { YongchengJpNote } from './sections/YongchengJpNote'
export { YongchengStaysSection } from './sections/YongchengStaysSection'
export { YongchengAppendix } from './sections/YongchengAppendix'

// Tokens / Types（給編輯器 / 資料層用）
export * from './tokens'
export type * from './types'
