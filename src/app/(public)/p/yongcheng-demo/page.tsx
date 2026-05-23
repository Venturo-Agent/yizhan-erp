/**
 * 永成款展示行程 — Demo 預覽
 *
 * 路由：/p/yongcheng-demo
 *
 * 用途：
 * - 給 William 視覺驗收
 * - 不接 DB、不接行程資料、純 fixture 範例
 * - 內容對齊 /Users/william/Downloads/tokyo-sendai-private-2026.html
 *
 * 上線真實版本（Phase 2）：
 * - /p/tour/[code] 會 fork 一條永成款路線、從 tour_display_overrides 讀 canvas JSON
 */

import { CanvasRenderer } from '@/components/canvas-renderer'
import { sendaiSampleCanvas } from '@/components/canvas-renderer/fixtures/sendai-sample'

export const metadata = {
  title: '角落旅行社｜2026 東京・仙台私人包團・六日（預覽）',
  description: '永成款展示行程預覽',
  robots: { index: false, follow: false },
}

export default function CanvasDemoPage() {
  return <CanvasRenderer canvas={sendaiSampleCanvas} />
}
