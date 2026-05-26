import { defineModule } from './_define'

/**
 * 平台整合 — 第三方 SaaS 整合（AiToEarn 內容自動分發等）
 *
 * 對應：
 * - 路由：/platform, /platform/aitoearn
 * - capability：platform_integrations.{read,write}
 * - tabs：無
 * - category：enterprise（workspace 內功能）
 *
 * 註：iframe / API 接入第三方平台、workspace 內功能
 *     不暴露給租戶 HR、由 admin 直接控管
 */
export const PlatformIntegrationsModule = defineModule({
  code: 'platform_integrations',
  name: '平台整合',
  description: '第三方 SaaS 整合（AiToEarn 內容自動分發等）— iframe / API 接入、workspace 內功能',
  category: 'enterprise',
  routes: ['/platform', '/platform/aitoearn'],
  exposedToHr: false,
  tabs: [],
})
