/**
 * POST /api/marketing/website/rebuild
 *
 * 觸發 Corner 官網（Astro SSG）重新 build + 部署。
 * 業務按「重新發布官網」按鈕、ERP 呼叫 Coolify deploy webhook、Coolify pull 最新
 * tour 上架資料 → rebuild Astro → 部署到 corner.venturo.tw。
 *
 * 為什麼後端代打不直接 client → Coolify：
 *   - Coolify token 不能 leak 到 browser（資安）
 *   - 後端可以做 audit log / capability 檢查 / rate limit（未來加）
 *   - 後端可以做去重（同一分鐘內按 10 次只觸發 1 次、避免 Coolify 排程爆掉）— 目前 v1 還沒做、之後加
 *
 * 守門：
 *   - requireCapability(marketing.website.write)
 *   - 環境變數：CORNER_WEBSITE_DEPLOY_WEBHOOK_URL + COOLIFY_API_TOKEN
 *     目前環境未設、第一次按會 logger 警告、回 503 not_configured
 */

import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { logger } from '@/lib/utils/logger'

interface RebuildResponse {
  triggered_at: string
  status: 'triggered' | 'not_configured' | 'failed'
  detail?: string
}

export async function POST(): Promise<NextResponse<RebuildResponse | { error: string }>> {
  try {
    const guard = await requireCapability(CAPABILITIES.MARKETING_WEBSITE_WRITE)
    if (!guard.ok) return guard.response as NextResponse<{ error: string }>

    const webhookUrl = process.env.CORNER_WEBSITE_DEPLOY_WEBHOOK_URL || ''
    const apiToken = process.env.COOLIFY_API_TOKEN || ''
    const triggeredAt = new Date().toISOString()

    if (!webhookUrl) {
      // 變數未設、不算錯（v1 第一次部署前可能還沒配）、回 503 提示
      logger.warn(
        '[marketing/website/rebuild] CORNER_WEBSITE_DEPLOY_WEBHOOK_URL 未設、跳過實際 rebuild trigger'
      )
      return NextResponse.json<RebuildResponse>(
        {
          triggered_at: triggeredAt,
          status: 'not_configured',
          detail: '尚未設定 CORNER_WEBSITE_DEPLOY_WEBHOOK_URL 環境變數',
        },
        { status: 503 }
      )
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (apiToken) {
        headers['Authorization'] = `Bearer ${apiToken}`
      }

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          triggered_by: guard.employeeId,
          triggered_at: triggeredAt,
        }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        logger.error('[marketing/website/rebuild] Coolify webhook failed', {
          status: res.status,
          body: text.slice(0, 500),
        })
        return NextResponse.json<RebuildResponse>(
          {
            triggered_at: triggeredAt,
            status: 'failed',
            detail: `Coolify 回應 HTTP ${res.status}`,
          },
          { status: 502 }
        )
      }

      return NextResponse.json<RebuildResponse>({
        triggered_at: triggeredAt,
        status: 'triggered',
      })
    } catch (fetchError) {
      logger.error('[marketing/website/rebuild] fetch error', fetchError)
      return NextResponse.json<RebuildResponse>(
        {
          triggered_at: triggeredAt,
          status: 'failed',
          detail: 'Coolify webhook 連線失敗',
        },
        { status: 502 }
      )
    }
  } catch (error) {
    logger.error('POST /api/marketing/website/rebuild error', error)
    return NextResponse.json({ error: '系統錯誤、請稍後再試' }, { status: 500 })
  }
}
