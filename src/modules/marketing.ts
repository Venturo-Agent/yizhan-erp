import { defineModule } from './_define'

/**
 * 行銷管理（marketing）— Corner 官網管行程上架用
 *
 * 背景（2026-05-20 William 拍板、corner-website ERP 整合 spec v1）：
 *   Corner Travel 官網（corner.venturo.tw、Astro SSG）走「ERP 是 SSOT、官網是櫥窗」
 *   業務在 /marketing/website 管理「哪些團要上架到官網 + 行銷文案 / SEO / 封面圖」
 *
 * 對應：
 *   - 路由：/marketing/website、/marketing/website/[code]
 *   - capability：marketing.website.{read,write}
 *   - DB：tours.is_public_listed / marketing_* / hero_image_url / seo_* / published_* 欄位
 *     （由 20260520000000_corner_travel_workspace_and_website_listing.sql 加好）
 *   - workspace_features：marketing（預設 false、Corner workspace seed 開 true）
 *
 * 為什麼是 basic 不是 premium：
 *   行銷網站管理是「賣團」的最後一哩、業務必用、不是付費加購。
 *   付費差異化在「有沒有獨立官網 domain」（漫途幫客戶架）、那層走商務談判、不在 module。
 *
 * 為什麼只一個 tab：
 *   v1 只做「官網行程上架」。未來可能加廣告管理 / EDM 等 tab、tab 級拆 capability 用。
 */
export const MarketingModule = defineModule({
  code: 'marketing',
  name: '行銷管理',
  description: '官網行程上架、行銷文案、SEO 設定（Corner 官網等）',
  category: 'basic',
  routes: ['/marketing/website', '/marketing/website/[code]'],
  exposedToHr: true,
  defaultRoles: ['admin', 'sales', 'manager'],
  tabs: [
    {
      code: 'website',
      name: '官網管理',
      description: '管理哪些團上架到 Corner 官網、編輯行銷文案 / SEO / 封面圖、觸發 rebuild',
    },
  ],
})
