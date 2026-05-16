/**
 * POST /api/cis/analyze
 *
 * 把拜訪 summary 文字分析成 BrandCard。
 *
 * 模式：
 *   - 有 ANTHROPIC_API_KEY → 真 Claude API call（mode='llm-pending'、等實作）
 *   - 沒有 → 啟發式分析（fallback、永遠可用）
 *
 * Response: { brand_card: BrandCard, mode: 'llm' | 'heuristic' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { heuristicAnalyze } from '@/lib/cis/heuristic-analyze'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'

export async function POST(req: NextRequest) {
  const guard = await requireCapability(CAPABILITIES.CIS_MANAGE_VISITS)
  if (!guard.ok) return guard.response

  const auditClient = await createApiClient()
  await recordApiAuditContext(auditClient, { actorId: guard.employeeId, reason: 'CIS 拜訪分析' })

  let summary = ''
  try {
    const body = (await req.json()) as { summary?: string }
    summary = (body.summary || '').slice(0, 8000)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!summary.trim()) {
    return NextResponse.json({ error: 'summary 不能為空' }, { status: 400 })
  }

  const hasLlmKey = !!process.env.ANTHROPIC_API_KEY

  const card = heuristicAnalyze(summary)
  return NextResponse.json({
    brand_card: card,
    mode: hasLlmKey ? 'llm-pending' : 'heuristic',
  })
}
