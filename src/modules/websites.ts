import { defineModule } from './_define'

/**
 * 客戶官網系統（websites）— addon 加購、不在套裝
 *
 * 2026-05-23 William 拍板（spec：workspace/_meta/architecture/2026-05-23-websites-module-spec.md）：
 *   客戶可加購「官網系統」、進 design 全螢幕編輯器、從 9 套 component 變體
 *   庫自由 mix-and-match 拼出官網。沒加購 = sidebar 看不到、漫途給預設組合。
 *
 * 對應：
 * - 路由：/websites（重定向）/ /websites/design（全螢幕）/ /websites/products（list）
 * - capability：website.design.{read,write} / website.products.{read,write}
 * - DB：workspaces.subdomain / canvas / canvas_updated_at|by / canvas_published_at|by
 * - workspace_features：website_builder（預設 false、簽 addon 後手動開）
 *
 * 跟既有 marketing module 分界：
 *   marketing = Corner 一個客戶的官網行程上架（Astro SSG 外部 repo、不動）
 *   websites = 多客戶通用（Next.js ISR、子網域 multi-tenant）
 *
 * 為什麼是 addon 不是 basic / premium：
 *   單獨加購商品、不在月費套裝、跟其他 addon (景點資料庫 / 飯店資料庫) 一個分類。
 */
export const WebsitesModule = defineModule({
  code: 'websites',
  name: '客戶官網系統',
  description: '加購後可進 design 編輯器自由排版、發布到 {subdomain}.venturo.tw',
  category: 'addon',
  routes: ['/websites', '/websites/design', '/websites/products', '/websites/products/[code]'],
  exposedToHr: true,
  defaultRoles: ['admin'],
  tabs: [
    {
      code: 'design',
      name: '版面設計',
      description: '進全螢幕編輯器、從 component 變體庫拼版面、改文案 / 配色 / 發布',
    },
    {
      code: 'products',
      name: '產品上架',
      description: '挑哪些團要上架到客戶官網、編輯行銷文案 / SEO / 封面圖',
    },
  ],
})
