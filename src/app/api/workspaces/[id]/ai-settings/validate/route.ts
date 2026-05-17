/**
 * POST /api/workspaces/[id]/ai-settings/validate
 *
 * UI wizard step 3「驗證」按鈕用：實際打一次 LLM API 確認 token 活的、
 * 但不存進 DB。token 明文進來、用完即丟、不寫 log。
 *
 * 守門：必須 workspaces.write capability
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerAuth } from '@/lib/auth/server-auth'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { validateMiniMaxToken } from '@/lib/ai/providers/minimax-client'
import { validateAnthropicToken } from '@/lib/ai/providers/anthropic-client'

const validateSchema = z.object({
  provider: z.enum(['minimax', 'anthropic', 'openrouter']),
  model: z.string().min(1).max(100),
  api_token: z.string().min(10).max(500),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _workspaceId } = await params

  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const { hasCapabilityByCode } = await import('@/app/api/lib/check-capability')
  const allowed = await hasCapabilityByCode(auth.data.employeeId, CAPABILITIES.WORKSPACES_WRITE)
  if (!allowed) {
    return NextResponse.json({ error: '需租戶管理權限' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
  }

  const parsed = validateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { provider, model, api_token } = parsed.data

  try {
    let result: { ok: boolean; error?: string; sample?: string }
    switch (provider) {
      case 'minimax':
        result = await validateMiniMaxToken(api_token, model)
        break
      case 'anthropic':
        result = await validateAnthropicToken(api_token, model)
        break
      case 'openrouter':
        // OpenRouter 驗證走 chat completions 試打、暫時 reuse minimax 邏輯不適合
        // 簡化：openrouter 暫時跳過驗證、回 ok（之後 v2 補）
        result = { ok: true, sample: 'OpenRouter 驗證暫未實作、視為通過' }
        break
      default:
        result = { ok: false, error: 'unknown provider' }
    }

    if (result.ok) {
      return NextResponse.json({
        valid: true,
        sample_response: result.sample ?? '',
      })
    }
    return NextResponse.json({
      valid: false,
      error: result.error ?? 'validation failed',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json(
      { valid: false, error: msg.slice(0, 200) },
      { status: 200 } // 200 + valid: false（UI 用 valid 判斷、不用 HTTP status）
    )
  }
}
