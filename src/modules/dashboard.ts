import { defineModule } from './_define'

/**
 * 首頁 — 系統首頁與儀表板（個人工作空間）
 *
 * 對應：
 * - 路由：/dashboard
 * - capability：dashboard.{read,write}
 * - tabs：無
 *
 * 註：dashboard 為個人工作空間（筆記 / 打卡 / widget 偏好）、
 *     不受職務權限控管、不暴露給 HR /hr/roles UI
 */
export const DashboardModule = defineModule({
  code: 'dashboard',
  name: '首頁',
  description: '系統首頁與儀表板',
  category: 'basic',
  routes: ['/dashboard'],
  exposedToHr: false,
  tabs: [],
})
