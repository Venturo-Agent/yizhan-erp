import { defineModule } from './_define'

/**
 * eSIM 管理（Worldmove）— 訂單、產品目錄、設定
 *
 * 對應：
 * - 路由：/esim（及 sub-routes）
 * - capability：esim.{orders,products,settings}.{read,write}
 * - tabs：3 個功能 tab
 *
 * 整合 Worldmove API、銷售旅遊 eSIM 至客戶。
 */
export const EsimModule = defineModule({
  code: 'esim',
  name: 'eSIM 管理',
  description: '旅遊 eSIM 訂單管理（Worldmove）、產品目錄與 API 設定',
  category: 'basic',
  routes: ['/esim', '/esim/orders', '/esim/products', '/esim/settings'],
  exposedToHr: true,
  tabs: [
    { code: 'orders', name: '訂單管理', description: '客戶 eSIM 訂單查詢與管理' },
    { code: 'products', name: '產品目錄', description: 'Worldmove eSIM 產品列表' },
    { code: 'settings', name: 'eSIM 設定', description: 'Worldmove API 串接設定' },
  ],
})
