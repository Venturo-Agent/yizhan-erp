import { defineModule } from './_define'

/**
 * 旅行屬性功能 — 團類型開關（機票 / 機加酒 / 訂房 / 派車 / 旅遊團）
 *
 * 對應：
 * - 路由：/tours（sub-feature、跟 tours module 共用路由）
 * - capability：tour_attributes.{read,write}
 * - tabs：無
 * - category：premium
 *
 * 註：tour_attributes 是 sub-feature、不獨立暴露給 HR /hr/roles UI、
 *     由 workspace_features 開關控制能否選團類型
 */
export const TourAttributesModule = defineModule({
  code: 'tour_attributes',
  name: '旅行屬性功能',
  description: '選擇團類型：機票、機加酒、訂房、派車、旅遊團',
  category: 'premium',
  routes: ['/tours'],
  exposedToHr: true,
  tabs: [],
})
