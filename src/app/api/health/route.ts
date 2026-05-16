import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const startedAt = new Date().toISOString()

/**
 * Health Check API
 * 檢查系統各項服務狀態
 *
 * GET /api/health
 *
 * 公開端點 — 回傳基本健康狀態 + 記憶體 / uptime / 版本
 */
/**
 * 故意不守 requireCapability：公開健檢、無身份驗證合理
 */
export async function GET() {
  const mem = process.memoryUsage()
  const memoryMB = {
    rss: Math.round(mem.rss / 1024 / 1024),
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
  }

  try {
    const supabase = getSupabaseAdminClient()
    const dbStart = Date.now()
    // estimated 對 health check 夠用、避免 sequential scan 拖慢監控
    const { error } = await supabase
      .from('employees')
      .select('count', { count: 'estimated', head: true })
    const dbLatencyMs = Date.now() - dbStart

    const payload = {
      status: error ? 'degraded' : 'healthy',
      version: process.env.npm_package_version ?? '1.0.0',
      startedAt,
      uptime: process.uptime(),
      dbLatencyMs: error ? null : dbLatencyMs,
      memory: memoryMB,
    }

    return NextResponse.json(payload, {
      status: error ? 207 : 200,
    })
  } catch {
    return NextResponse.json(
      {
        status: 'unhealthy',
        version: process.env.npm_package_version ?? '1.0.0',
        startedAt,
        uptime: process.uptime(),
        dbLatencyMs: null,
        memory: memoryMB,
      },
      { status: 503 }
    )
  }
}
