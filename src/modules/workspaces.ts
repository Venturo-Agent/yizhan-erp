import { defineModule } from './_define'

/**
 * 租戶管理 — 管理所有 workspace（漫途專用）
 *
 * 對應：
 * - 路由：/workspaces
 * - capability：workspaces.{read,write}
 * - tabs：無
 * - category：enterprise（跨 workspace 能力、限漫途使用）
 *
 * 註：跨 workspace 能力 feature — 漫途的 workspace 開了 → 漫途有對應 capability 的 role 能用
 *     別的客戶沒開 → 看不到、用不了
 *     鐵律：系統內沒有 user 特權、所有訪問控制只走 workspace_features + role_capabilities
 *     不暴露給租戶 HR、只有漫途內部使用
 */
export const WorkspacesModule = defineModule({
  code: 'workspaces',
  name: '租戶管理',
  description:
    '管理所有 workspace（建立 / 編輯 / 停用其他公司租戶）— 跨 workspace 能力、限漫途使用',
  category: 'enterprise',
  routes: ['/workspaces'],
  exposedToHr: true,
  tabs: [],
})
