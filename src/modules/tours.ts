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
    { code: 'closing', name: '結案', description: '結案報表、損益確認' },
    // 可建立模板：職務權限開關（5/24 William 拍板獨立成權限）。
    // 不是所有人都能建模板 → 勾此能力的職務才看得到「開模板」選項。只需 write（純授權開關）。
    {
      code: 'template',
      name: '可建立模板',
      description: '能把行程存成標準模板供重複使用（建正式團/提案不需此能力）',
      capabilities: ['write'],
    },
    // 5/24 純角色 SSOT：移除 as_sales/as_assistant/as_controller 三個資格旗標。
    // 業務候選 = 有 orders.create/edit.write 的人、團控候選 = 有 tours.members.write 的人、助理已廢。
  ],
})
