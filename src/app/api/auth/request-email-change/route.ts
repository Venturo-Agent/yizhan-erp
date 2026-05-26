/**
 * POST /api/auth/request-email-change
 *
 * 員工提交「變更 Email」審核請求
 *
 * Body：
 *   - new_email: 新 email
 *   - current_password: 舊密碼（驗證後才能提交、防 session 被偷接管）
 *
 * 流程：
 *   1. 驗 current_password（用 Supabase auth.signInWithPassword）
 *   2. 不直接改 email、改成寫 approval_requests row（type=email_change）
 *   3. 通知 system_notice channel 給 HR 看到
 *   4. HR 在 /api/approvals/[id] PATCH approve → dispatchApprovalSideEffect 才實際改 email
 *
 * 為什麼這樣設計（William 5/23 拍板）：
 *   - 員工自己改 email 沒驗證 = 接管帳號風險（session 被偷、改 email 重設密碼）
 *   - HR 審核 = 雙保險、避免共用電腦 / 離職員工搗亂
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiClient } from '@/lib/supabase/api-client'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { validateBody } from '@/lib/api/validation'
import { apiHandler } from '@/lib/api/api-handler'
import { createApprovalRequest } from '@/app/api/approvals/route'
import { APPROVAL_REQUEST_TYPES } from '@/lib/approvals/dispatch'
import { logger } from '@/lib/utils/logger'

const schema = z.object({
  new_email: z.string().email(),
  current_password: z.string().min(1),
  reason: z.string().max(500).optional().nullable(),
})

export const POST = apiHandler(async (request: NextRequest) => {
  const auth = await getServerAuth()
  if (!auth.success) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const v = await validateBody(request, schema)
  if (!v.success) return v.error

  const workspaceId = auth.data.workspaceId
  const employeeId = auth.data.employeeId

  // 1. 拿到 employee 的 user_id + 目前 email、防搞錯目標
  const supabase = await createApiClient()
  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .select('id, user_id, email')
    .eq('id', employeeId)
    .maybeSingle<{ id: string; user_id: string | null; email: string | null }>()

  if (empErr || !emp) {
    return NextResponse.json({ error: '查不到員工資料' }, { status: 404 })
  }
  if (!emp.user_id || !emp.email) {
    return NextResponse.json({ error: '員工無登入帳號、無法變更 email' }, { status: 400 })
  }

  if (v.data.new_email.toLowerCase() === emp.email.toLowerCase()) {
    return NextResponse.json({ error: '新 email 跟目前相同、無需變更' }, { status: 400 })
  }

  // 2. 驗 current_password（用 admin client signInWithPassword、不影響當前 session）
  const adminClient = getSupabaseAdminClient()
  const { error: signInErr } = await adminClient.auth.signInWithPassword({
    email: emp.email,
    password: v.data.current_password,
  })
  if (signInErr) {
    logger.warn('[request-email-change] password verify failed', {
      employeeId,
      err: signInErr.message,
    })
    return NextResponse.json({ error: '舊密碼錯誤' }, { status: 403 })
  }

  // 3. 寫 approval_request
  const result = await createApprovalRequest({
    workspaceId,
    requesterId: employeeId,
    requestType: APPROVAL_REQUEST_TYPES.EMAIL_CHANGE,
    targetId: emp.id,
    payload: {
      old_email: emp.email,
      new_email: v.data.new_email,
      user_id: emp.user_id,
    },
    reason: v.data.reason ?? null,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? '提交失敗' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Email 變更請求已提交、等 HR 審核。通過後 Supabase 會寄驗證信到新 email。',
    approval_id: result.id,
  })
})
