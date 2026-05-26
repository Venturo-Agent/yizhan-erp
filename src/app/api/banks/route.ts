import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { ApiError } from '@/lib/api/response'
import { hasCapabilityByCode } from '@/app/api/lib/check-capability'
import { translateDbError } from '@/lib/db-error-translate'
import { apiHandler } from '@/lib/api/api-handler'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import type { SupabaseClient } from '@supabase/supabase-js'

// ref_banks 為全平台共用 ref data（共用資料層、台灣金融機構代號表）
// 守門：shared_data.banks.write capability（目前只有漫途 admin role 有、未來開放給開了 shared_data_codes feature 的 workspace）
// 規格：[[Logan-Workspace/audit/2026-05-11-公共資源管理-規格.md]]
export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await getServerAuth()
  if (!auth.success) {
    return ApiError.unauthorized('請先登入')
  }

  const allowed = await hasCapabilityByCode(auth.data.employeeId, 'shared_data.banks.write')
  if (!allowed) {
    return NextResponse.json(
      { error: '您沒有此權限（新增銀行需 shared_data.banks.write capability）' },
      { status: 403 }
    )
  }

  const auditClient = await createApiClient()
  await recordApiAuditContext(auditClient, {
    actorId: auth.data.employeeId,
    reason: '新增/更新銀行資料',
  })

  const body = await req.json()
  const { bank_code, bank_name, english_name, swift_code, is_active, display_order } = body

  if (!bank_code || !bank_name) {
    return NextResponse.json({ error: '缺少必填欄位（bank_code / bank_name）' }, { status: 400 })
  }
  if (!/^\d{3}$/.test(bank_code)) {
    return NextResponse.json(
      { error: '銀行代碼必須為 3 碼數字（中央銀行金融機構代號）' },
      { status: 400 }
    )
  }

  // ref_banks 尚未納入生成類型，用 unknown 中轉
  const supabase = getSupabaseAdminClient() as unknown as SupabaseClient
  const { error } = await supabase.from('ref_banks').upsert(
    {
      bank_code,
      bank_name,
      english_name: english_name ?? null,
      swift_code: swift_code ?? null,
      is_active: is_active ?? true,
      display_order: display_order ?? 999,
      created_by_workspace_id: auth.data.workspaceId,
      created_by_user_id: auth.data.user.id,
    },
    { onConflict: 'bank_code' }
  )

  if (error) {
    const t = translateDbError(error)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }

  return NextResponse.json({ bank_code })
})
