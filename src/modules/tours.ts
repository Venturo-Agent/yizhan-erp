import { defineModule } from './_define'

/**
 * 旅遊團管理 — 一棧 ERP 核心模組
 *
 * 對應：
 * - 路由：/tours, /tours/[code]
 * - capability：tours.{read,write} + tours.{overview,orders,members,...}.{read,write}
 * - tabs：團務管理 8 個功能 tab + 3 個下拉資格 tab
 */
export const ToursModule = defineModule({
  code: 'tours',
  name: '旅遊團管理',
  description: '團務管理核心功能',
  category: 'basic',
  routes: ['/tours', '/tours/[code]'],
  exposedToHr: true,
  defaultRoles: ['admin', 'sales', 'manager'],
  // module-level：tours.read / tours.write（總開關）
  moduleLevelCapabilities: ['read', 'write'],
  tabs: [
    { code: 'overview', name: '總覽', description: '團號、日期、目的地、負責人' },
    { code: 'orders', name: '訂單', description: '報名訂單、付款狀態' },
    { code: 'members', name: '團員', description: '團員資料、護照、聯絡資訊' },
    { code: 'itinerary', name: '行程', description: '每日行程內容' },
    {
      code: 'display-itinerary',
      name: '展示行程',
      description: '對客展示用行程頁面編輯器',
      category: 'premium',
    },
    { code: 'quote', name: '報價', description: '報價計算、成本' },
    { code: 'contract', name: '合約', description: '旅遊合約、電子簽約', category: 'premium' },
    { code: 'closing', name: '結案', description: '結團報表、損益確認' },
    // ===== 下拉資格（勾寫入 = 出現在該下拉）=====
    {
      code: 'as_sales',
      name: '可當承辦業務',
      description: '勾寫入 → 出現在訂單「承辦業務」下拉',
      isEligibility: true,
    },
    {
      code: 'as_assistant',
      name: '可當助理',
      description: '勾寫入 → 出現在訂單「助理」下拉',
      isEligibility: true,
    },
    {
      code: 'as_controller',
      name: '可當團控',
      description: '勾寫入 → 出現在旅遊團「團控」下拉',
      isEligibility: true,
    },
  ],
})
