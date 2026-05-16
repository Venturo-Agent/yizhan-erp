/**
 * AI Hub layout — 2026-05-15 William 拍板從沉浸式改回標準
 *
 * 之前是 CUSTOM_LAYOUT（仿 channels 滿版）、「通道設定」進去時主標題區被覆蓋、
 * user 找不到怎麼切換。改回標準 layout：framework header / sidebar 都顯示、
 * page.tsx 內用 ContentPageLayout（tabs prop）做頁籤、跟租戶管理頁一致。
 *
 * 此 layout 不再特殊化、直接 pass children（main-layout.tsx 提供標準 framework）。
 */
export default function AiHubLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
