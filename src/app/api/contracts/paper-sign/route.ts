import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/contracts/paper-sign
 *
 * 標記合約為紙本簽署（需要登入 + 合約寫入權）
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireCapability(CAPABILITIES.TOURS_CONTRACT_WRITE)
    if (!guard.ok) return guard.response

    const supabase = await createApiClient()
    const { contractId, signedDate } = await request.json()

    await recordApiAuditContext(supabase, { actorId: guard.employeeId, reason: '紙本簽署合約', requestId: contractId })

    if (!contractId) {
      return NextResponse.json({ error: '缺少合約 ID' }, { status: 400 })
    }

    const signedAt = signedDate ? new Date(signedDate).toISOString() : new Date().toISOString()

    // 更新合約狀態為已簽署（紙本）（RLS 自動過濾、capability 已守第一關）
    const { error } = await supabase
      .from('contracts')
      .update({
        status: 'signed',
        signed_at: signedAt,
        signature_ip: 'paper',
        signature_user_agent: '紙本簽署',
      })
      .eq('id', contractId)

    if (error) {
      logger.error('Paper sign error:', error)
      const t = translateDbError(error)
      return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Paper sign uncaught:', err)
    const t = translateDbError(err)
    return NextResponse.json({ error: t.message, code: t.code, field: t.field }, { status: t.httpStatus })
  }
}
