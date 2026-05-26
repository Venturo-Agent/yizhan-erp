import { NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { translateDbError } from '@/lib/db-error-translate'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'

/**
 * auth-only 合理：員工自己用 Amadeus 票務 TOTP、登入即可
 */
export async function DELETE() {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const apiClient = await createApiClient()
    await recordApiAuditContext(apiClient, {
      actorId: auth.data.employeeId,
      reason: '清除 Amadeus TOTP',
    })

    const supabase = getSupabaseAdminClient()
    const { error } = await supabase
      .from('employees')
      .update({
        amadeus_totp_secret: null,
        amadeus_totp_account_name: null,
      } as never)
      .eq('id', auth.data.employeeId)

    if (error) {
      logger.error('Amadeus TOTP delete DB error:', error)
      const t = translateDbError(error)
      return NextResponse.json(
        { error: t.message, code: t.code, field: t.field },
        { status: t.httpStatus }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Amadeus TOTP delete error:', err)
    const t = translateDbError(err)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }
}
