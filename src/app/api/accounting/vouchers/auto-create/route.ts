import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'
import { getServerAuth } from '@/lib/auth/server-auth'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { validateBody } from '@/lib/api/validation'
import { autoCreateVoucherSchema } from '@/lib/validations/api-schemas'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import {
  createVoucherFromReceipt,
  createVoucherFromPaymentRequest,
  createVoucherFromDisbursement,
} from './auto-create-voucher-builder'

const getSupabase = getSupabaseAdminClient

/**
 * 自動產生傳票 API（使用使用者設定的科目，不再硬編碼）
 *
 * POST /api/accounting/vouchers/auto-create
 *
 * Body:
 * - source_type: 'payment_request' | 'receipt' | 'disbursement_order'
 * - source_id: string (請款單/收款單/出納單 ID)
 * - workspace_id: string
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireCapability(CAPABILITIES.ACCOUNTING_VOUCHERS_WRITE)
    if (!guard.ok) return guard.response
    // 🔒 必須登入、且 body 內的 workspace_id 必須等於使用者所屬 workspace、防跨租戶建傳票
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    // 🔒 zod schema 守 source_type enum + UUID 格式
    const validation = await validateBody(request, autoCreateVoucherSchema)
    if (!validation.success) return validation.error
    const { source_type, source_id, workspace_id } = validation.data

    if (workspace_id !== auth.data.workspaceId) {
      return NextResponse.json({ error: '無權對其他 workspace 建立傳票' }, { status: 403 })
    }

    // audit context（追蹤誰自動產生傳票）
    const auditClient = await createApiClient()
    await recordApiAuditContext(auditClient, {
      actorId: guard.employeeId,
      reason: `自動產生傳票（${source_type}）`,
      requestId: source_id,
    })

    // opt-in 守門：未啟用會計的租戶 skip、不報錯（業務鏈路照跑）
    const { data: feat } = await getSupabase()
      .from('workspace_features')
      .select('enabled')
      .eq('workspace_id', workspace_id)
      .eq('feature_code', 'accounting')
      .maybeSingle()

    if (!feat?.enabled) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'accounting_not_enabled',
      })
    }

    let voucher

    switch (source_type) {
      case 'payment_request':
        voucher = await createVoucherFromPaymentRequest(workspace_id, source_id)
        break
      case 'receipt':
        voucher = await createVoucherFromReceipt(workspace_id, source_id)
        break
      case 'disbursement_order':
        voucher = await createVoucherFromDisbursement(workspace_id, source_id)
        break
      default:
        return NextResponse.json({ error: `不支援的來源類型：${source_type}` }, { status: 400 })
    }

    return NextResponse.json({ success: true, voucher })
  } catch (error) {
    logger.error('自動產生傳票失敗:', error)
    return dbErrorResponse(error)
  }
}
