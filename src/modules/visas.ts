import { defineModule } from './_define'

/**
 * 簽證代辦管理 — 客戶證件抽屜 + 代辦進度 + 代辦商價目
 *
 * 對應：
 * - 路由：/visas、/library/document-types、/library/application-service-types、
 *         /suppliers/[id]/pricing；客戶頁 /library/customers/[id] 加「證件」tab
 * - capability：visas.applications / documents / document_types / service_types / pricing × {read,write}
 * - 字典依賴：document_types（客戶證件分類）、application_service_types（代辦服務種類含急件）
 * - 主檔：customer_documents（客戶證件抽屜）、supplier_pricing（代辦商價目含版本）
 * - 事件：customer_document_applications + history（pipeline + 軌跡）
 *
 * 重啟脈絡（William 2026-05-20 拍板）：
 *   - 5/7 砍 visas 表後、5/11 visa 改成 tour_service_type='visa'。
 *     但「客戶證件 + 代辦進度」這層需求一直沒有家、重新建。
 *   - 證件 = 客戶資產（跟著客人走、不跟著團走）
 *   - 客人可能不是找我們辦的、抽屜獨立於申辦事件
 *   - 急件 / 一般在 application_service_types 拆種類、不在 schema 塞 flag
 *   - 代辦商價目走 supplier_pricing 含版本歷史、不再「打字輸入廠商名 + 自填成本」
 *   - 紅線 D：申辦 collected 之後鎖死、要改走作廢 + 重新登記
 */
export const VisasModule = defineModule({
  code: 'visas',
  name: '簽證代辦',
  description: '證件代辦進度管理、客戶證件抽屜、代辦商價目（含版本歷史）',
  category: 'basic',
  routes: [
    '/visas',
    '/library/document-types',
    '/library/application-service-types',
    '/suppliers/[code]/pricing',
  ],
  exposedToHr: true,
  defaultRoles: ['admin', 'sales', 'manager'],
  tabs: [
    { code: 'applications', name: '申辦進度', description: '送件、取件、退件、歸還客戶' },
    { code: 'documents', name: '客戶證件抽屜', description: '客戶所持證件總覽、含申辦歷史' },
    { code: 'document_types', name: '證件種類', description: '證件分類字典維護（護照、台胞證、各國簽證等）' },
    { code: 'service_types', name: '服務種類', description: '代辦服務種類字典（含一般 / 急件區分）' },
    { code: 'pricing', name: '代辦商價目', description: '各代辦商對各服務的價目（含版本歷史）' },
  ],
})
