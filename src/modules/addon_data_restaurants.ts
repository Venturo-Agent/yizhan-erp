import { defineModule } from './_define'

/**
 * 附加服務 — 餐廳資料庫
 *
 * 商業：客戶單獨購買、可讀漫途整理的公共池餐廳資料（restaurants 表 NULL workspace）
 *
 * 對應：
 * - capability：addon_data_restaurants.read（買了才有的讀權）
 * - 寫權：另由 shared_data.restaurants.write 控（漫途 + 角落限定、跟訂閱無關）
 *
 * 註：不暴露給租戶 HR、客戶買了就是讀
 *     UI 入口在 /workspaces/[id] 「附加服務」tab、漫途 admin 勾給對方
 */
export const AddonDataRestaurantsModule = defineModule({
  code: 'addon_data_restaurants',
  name: '餐廳資料庫',
  description: '購買後可讀漫途整理的餐廳公共池資料',
  category: 'addon',
  routes: [],
  exposedToHr: true,
  tabs: [],
})
