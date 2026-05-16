import { defineModule } from './_define'

/**
 * 附加服務 — 景點資料庫
 *
 * 商業：客戶單獨購買、可讀漫途整理的公共池景點資料（attractions 表 NULL workspace）
 *
 * 對應：
 * - capability：addon_data_attractions.read（買了才有的讀權）
 * - 寫權：另由 shared_data.attractions.write 控（漫途 + 角落限定、跟訂閱無關）
 * - 跟 /library/attractions 路由互動：客戶有此 feature → RLS 放行讀公共池
 *
 * 註：不暴露給租戶 HR（exposedToHr: true）、客戶買了就是讀、不分 role
 *     UI 入口在 /workspaces/[id] 「附加服務」tab、漫途 admin 勾給對方
 */
export const AddonDataAttractionsModule = defineModule({
  code: 'addon_data_attractions',
  name: '景點資料庫',
  description: '購買後可讀漫途整理的景點公共池資料',
  category: 'addon',
  routes: [],
  exposedToHr: true,
  tabs: [],
})
