import { defineModule } from './_define'

/**
 * 溝通頻道 — 內部訊息 / 公告 / 專案頻道 / HAPPY AI DM
 *
 * 對應：
 * - 路由：/channels, /channels/[id]
 * - capability：channels.{read,write} + channels.manage.{read,write}
 * - tabs：1 個（manage — 限 admin / 老闆）
 */
export const ChannelsModule = defineModule({
  code: 'channels',
  name: '溝通頻道',
  description: '內部訊息、公告、專案頻道、HAPPY AI DM',
  category: 'basic',
  routes: ['/channels', '/channels/[id]'],
  // 5/13 William 拍板 v2：
  // - channels.read / channels.write = 個人空間標配（看訊息、發訊息）、強制給所有員工
  // - channels.manage（發公告）= 業務功能、HR 可配置、之後設計「特別的設定」（William 訊息 #949）
  // - 紅線 #0：沒有 admin only、走 capability
  exposedToHr: true,
  defaultRoles: ['admin', 'sales', 'manager'],
  moduleLevelCapabilities: ['read', 'write'],
  tabs: [
    {
      code: 'manage',
      name: '管理頻道',
      description: '建 / 刪 / 改頻道設定（限管理員）',
    },
    {
      // 5/13 William 拍板：公告類頻道限發言、其他人只能 reply 留言串
      // 有此 capability = 能在公告類 channel 發訊息（非 reply）
      // 沒有 = 只能在 reply_to_id 下留言
      code: 'announcement',
      name: '發送公告',
      description: '在公告類頻道（重要事項 / 日常公告 / 表揚紀錄）發送訊息',
    },
  ],
  // 5/13 William 拍板：HAPPY 機器人頻道是「子 feature」、需付費加購
  // workspace_features 用 'channels.happy' 字串、UI 用 isFeatureEnabled('channels.happy')
  subFeatures: [
    {
      code: 'channels.happy',
      name: 'HAPPY 機器人',
      description: 'AI 助手「哈比」進駐頻道、能查訂單 / 客戶 / 旅遊團資料',
      category: 'premium',
    },
  ],
})
