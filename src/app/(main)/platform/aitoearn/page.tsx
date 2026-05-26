'use client'

/**
 * AiToEarn iframe 整合頁
 *
 * Phase 3.1（2026-05-10）— Super App 戰略 v1：
 * - AiToEarn docker 跑在 Vultr、走 Coolify Traefik 反代到 https://aitoearn.venturo.tw
 * - 此頁純 iframe 嵌入、ERP / AiToEarn 各自登入（v1 限制）
 * - v2 (Phase 4) 補 SSO + API 整合（排期 / 訂單資料打通）
 *
 * 守門：跟一般 feature 一樣、吃 workspace_features('platform_integrations') + role_capabilities
 *
 * URL 來源優先順序：
 * 1. NEXT_PUBLIC_AITOEARN_URL（部署時設）
 * 2. fallback https://aitoearn.venturo.tw（production 已部署）
 *
 * 視覺整合（2026-05-10 修）：
 * - 拿掉 page-level header（h1 + 開新分頁 link）— ERP 全局 layout 已有 sidebar / header、不重複
 * - iframe 滿屏、用 -m-4 / -m-6 抵掉外層 padding、看起來像「我家功能」不像「外掛網頁」
 * - 不要顯示「載入中」/「載入失敗」狀態（瀏覽器自帶、加 overlay 反而像外掛）
 */

const AITOEARN_URL = process.env.NEXT_PUBLIC_AITOEARN_URL || 'https://aitoearn.venturo.tw'

export default function AiToEarnPage() {
  return (
    <iframe
      src={AITOEARN_URL}
      className="flex-1 w-full border-0 -m-4 lg:-m-6"
      title="AiToEarn"
      // sandbox v1 寬鬆設定（同源 + script + form + popup）
      // v2 加 SSO 後考慮收緊（移除 allow-same-origin、改 postMessage 通訊）
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
    />
  )
}
