import { defineModule } from './_define'

/**
 * 漫途 CIS 工作流 — 客戶識別系統規劃（漫途整合行銷專屬）
 *
 * 對應：
 * - 路由：/cis, /cis/pricing
 * - capability：cis.{clients,visits,pricing}.{read,write}
 * - tabs：3 個（clients / visits / pricing）
 * - category：enterprise（漫途自家業務）
 */
export const CisModule = defineModule({
  code: 'cis',
  name: '漫途 CIS 工作流',
  description: '客戶識別系統規劃（漫途整合行銷專屬）',
  category: 'enterprise',
  routes: ['/cis', '/cis/pricing'],
  exposedToHr: true,
  defaultRoles: ['admin', 'manager'],
  tabs: [
    { code: 'clients', name: '客戶管理', description: '旅行社客戶清單' },
    {
      code: 'visits',
      name: '拜訪紀錄',
      description: '五階段引導對話 + 品牌資料卡',
    },
    {
      code: 'pricing',
      name: '衍生項目價目',
      description: 'CIS 衍生項目價目表',
    },
  ],
})
