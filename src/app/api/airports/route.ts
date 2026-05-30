import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { ApiError } from '@/lib/api/response'
import { hasCapabilityByCode } from '@/app/api/lib/check-capability'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { apiHandler } from '@/lib/api/api-handler'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'

// ref_airports 為全平台共用 ref data（共用資料層）
// 守門：shared_data.airports.write capability（目前只有漫途 admin role 有、未來開放給開了 shared_data_codes feature 的 workspace）
// 規格：[[Logan-Workspace/audit/2026-05-11-公共資源管理-規格.md]]
export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await getServerAuth()
  if (!auth.success) {
    return ApiError.unauthorized('請先登入')
  }

  const allowed = await hasCapabilityByCode(auth.data.employeeId, 'shared_data.airports.write')
  if (!allowed) {
    return NextResponse.json(
      { error: '您沒有此權限（新增機場需 shared_data.airports.write capability）' },
      { status: 403 }
    )
  }

  const auditClient = await createApiClient()
  await recordApiAuditContext(auditClient, {
    actorId: auth.data.employeeId,
    reason: '新增/更新機場資料',
  })

  const body = await req.json()
  const {
    iata_code,
    icao_code,
    name_en,
    name_zh,
    city_code,
    city_name_en,
    city_name_zh,
    country_code,
    timezone,
    latitude,
    longitude,
  } = body

  if (!iata_code) {
    return NextResponse.json({ error: '缺少必填欄位 iata_code' }, { status: 400 })
  }
  if (!/^[A-Z]{3}$/.test(iata_code)) {
    return NextResponse.json({ error: 'IATA 代碼必須為 3 碼大寫英文' }, { status: 400 })
  }

  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from('ref_airports').upsert(
    {
      iata_code,
      icao_code: icao_code ?? null,
      name_en: name_en ?? null,
      name_zh: name_zh ?? null,
      city_code: city_code ?? null,
      city_name_en: city_name_en ?? null,
      city_name_zh: city_name_zh ?? null,
      country_code: country_code ?? null,
      timezone: timezone ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      created_by_workspace_id: auth.data.workspaceId,
      created_by_user_id: auth.data.user.id,
    },
    { onConflict: 'iata_code' }
  )

  if (error) {
    return dbErrorResponse(error)
  }

  return NextResponse.json({ iata_code })
})
