/**
 * POST /api/shared-data/attractions/ai-polish
 *
 * 景點文字 AI 潤飾 — 傳入景點基本資訊 + 欄位，回傳潤飾後文字。
 * 守門：database.attractions.write capability（有權限編輯景點的人才能用）
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { polishAttractionText } from '@/lib/ai/attraction-polish'
import { logger } from '@/lib/utils/logger'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'

export async function POST(req: NextRequest) {
  const guard = await requireCapability(CAPABILITIES.DATABASE_MANAGE_ATTRACTIONS)
  if (!guard.ok) return guard.response

  const auditClient = await createApiClient()
  await recordApiAuditContext(auditClient, {
    actorId: guard.employeeId,
    reason: '景點文字 AI 潤飾',
  })

  let body: {
    name?: string
    category?: string
    field?: string
    currentContent?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, category, field, currentContent } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: '景點名稱不能為空' }, { status: 400 })
  }

  if (field !== 'description' && field !== 'notes') {
    return NextResponse.json({ error: 'field 必須是 description 或 notes' }, { status: 400 })
  }

  try {
    const result = await polishAttractionText({
      name: name.trim(),
      category: category?.trim(),
      field,
      currentContent: currentContent?.trim() ?? '',
    })

    return NextResponse.json({ polished: result.polished, provider: result.provider })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    if (message === 'AI_NOT_CONFIGURED') {
      return NextResponse.json(
        { error: 'AI 尚未設定，請聯絡系統管理員設定 MINIMAX_API_KEY 或 VENTURO_AI_BRAIN_KEY' },
        { status: 503 }
      )
    }

    logger.error('attraction ai-polish error:', err)
    return NextResponse.json({ error: 'AI 潤飾失敗，請稍後再試' }, { status: 500 })
  }
}
