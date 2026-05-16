import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { ApiError } from '@/lib/api/response'
import { hasCapabilityByCode } from '@/app/api/lib/check-capability'
import { translateDbError } from '@/lib/db-error-translate'
import { apiHandler } from '@/lib/api/api-handler'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'

// ref_countries 為全平台共用 ref data（共用資料層）
// 守門：shared_data.countries.write capability（目前只有漫途 admin role 有、未來開放給開了 shared_data_codes feature 的 workspace）
// 規格：[[Logan-Workspace/audit/2026-05-11-公共資源管理-規格.md]]
export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await getServerAuth()
  if (!auth.success) {
    return ApiError.unauthorized('請先登入')
  }

  const allowed = await hasCapabilityByCode(
    auth.data.employeeId,
    'shared_data.countries.write'
  )
  if (!allowed) {
    return NextResponse.json(
      { error: '您沒有此權限（新增國家需 shared_data.countries.write capability）' },
      { status: 403 }
    )
  }

  const auditClient = await createApiClient()
  await recordApiAuditContext(auditClient, { actorId: auth.data.employeeId, reason: '新增/更新國家資料' })

  const body = await req.json()
  const { code, name_zh, name_en, continent, sub_region, is_active } = body

  if (!code || !name_zh || !name_en) {
    return NextResponse.json({ error: '缺少必填欄位（code / name_zh / name_en）' }, { status: 400 })
  }
  if (!/^[A-Z]{2}$/.test(code)) {
    return NextResponse.json({ error: '國家代碼必須為 2 碼大寫英文（ISO 3166-1 alpha-2）' }, { status: 400 })
  }

  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from('ref_countries').upsert(
    {
      code,
      name_zh,
      name_en,
      continent: continent ?? null,
      sub_region: sub_region ?? null,
      is_active: is_active ?? true,
      created_by_workspace_id: auth.data.workspaceId,
      created_by_user_id: auth.data.user.id,
    },
    { onConflict: 'code' }
  )

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
  }

  return NextResponse.json({ code })
})
