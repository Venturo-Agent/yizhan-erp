import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { translateDbError } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'
import { BonusSettingType, BonusCalculationType } from '@/types/bonus.types'

/**
 * PATCH /api/workspaces/[id]/company-settings
 *
 * 公司設定 partial update：
 *   - workspaces 欄位（allowlist 白名單）：公司資料 / logo / 結帳設定 / 手續費 / 集團出帳 / 旅行屬性…
 *   - profit_tax_rate：upsert workspace_bonus_defaults 的 PROFIT_TAX row（null = 刪除 = 不扣稅）
 *
 * 2026-05-19 加：對齊紅線 F、client 不直接 supabase write、走 API route。
 * 2026-05-29：公司設定主存檔（整份表單）也改走此 API（原 client 直存違反紅線 F），改用欄位白名單。
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: workspaceId } = await params

  const guard = await requireCapability(CAPABILITIES.SETTINGS_MANAGE_COMPANY)
  if (!guard.ok) return guard.response

  // 確認該 user 屬於這個 workspace（防跨租戶滲透）
  if (guard.workspaceId && guard.workspaceId !== workspaceId) {
    return NextResponse.json({ error: '跨租戶禁止' }, { status: 403 })
  }

  const supabase = getSupabaseAdminClient()
  await recordApiAuditContext(supabase, {
    actorId: guard.employeeId,
    reason: '更新公司結帳設定',
  })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
  }

  try {
    // A. workspaces 欄位 partial update
    //    2026-05-29：公司設定主存檔改走此 API（原 client 直接 supabase.update 違反紅線 F）。
    //    用 allowlist 白名單只收可編輯欄位、防任意欄位注入（如 subscription_plan / is_multi_branch / created_by）。
    const ALLOWED_WORKSPACE_COLUMNS = [
      'transfer_fee_mode',
      'transfer_fee_unified_amount',
      'transfer_fee_overflow_account_id',
      'logo_url',
      'logo_scale',
      'logo_offset_x',
      'logo_offset_y',
      'legal_name',
      'subtitle',
      'address',
      'phone',
      'fax',
      'email',
      'website',
      'tax_id',
      'company_seal_url',
      'personal_seal_url',
      'invoice_seal_image_url',
      'contract_seal_image_url',
      'default_billing_day_of_week',
      'finance_centralized',
      'enabled_tour_categories',
    ] as const

    const patch: Record<string, unknown> = {}
    for (const key of ALLOWED_WORKSPACE_COLUMNS) {
      if (body[key] !== undefined) patch[key] = body[key]
    }

    // 有約束欄位的型別/範圍驗證（DB 另有 CHECK/FK 兜底、這裡先擋掉明顯非法值）
    if (
      patch.transfer_fee_mode !== undefined &&
      patch.transfer_fee_mode !== 'average' &&
      patch.transfer_fee_mode !== 'unified'
    ) {
      return NextResponse.json({ error: '無效的手續費模式' }, { status: 400 })
    }
    if (patch.logo_scale !== undefined) {
      const s = patch.logo_scale
      if (typeof s !== 'number' || !Number.isFinite(s) || s < 0.25 || s > 4.0) {
        return NextResponse.json({ error: 'logo_scale 範圍 0.25-4.0' }, { status: 400 })
      }
    }
    if (patch.logo_offset_x !== undefined) {
      const x = patch.logo_offset_x
      if (typeof x !== 'number' || !Number.isInteger(x) || x < -200 || x > 800) {
        return NextResponse.json({ error: 'logo_offset_x 範圍 -200 到 800' }, { status: 400 })
      }
    }
    if (patch.logo_offset_y !== undefined) {
      const y = patch.logo_offset_y
      if (typeof y !== 'number' || !Number.isInteger(y) || y < -100 || y > 200) {
        return NextResponse.json({ error: 'logo_offset_y 範圍 -100 到 200' }, { status: 400 })
      }
    }
    if (patch.default_billing_day_of_week != null) {
      const d = patch.default_billing_day_of_week
      if (typeof d !== 'number' || !Number.isInteger(d) || d < 0 || d > 6) {
        return NextResponse.json({ error: '出帳日須 0-6' }, { status: 400 })
      }
    }
    if (patch.transfer_fee_unified_amount != null) {
      const a = patch.transfer_fee_unified_amount
      if (typeof a !== 'number' || a < 0) {
        return NextResponse.json({ error: '固定收取金額須 >= 0' }, { status: 400 })
      }
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('workspaces').update(patch).eq('id', workspaceId)
      if (error) {
        const t = translateDbError(error)
        return NextResponse.json({ error: t.message }, { status: t.httpStatus })
      }
    }

    // 2. profit_tax_rate：upsert workspace_bonus_defaults PROFIT_TAX row
    if (body.profit_tax_rate !== undefined) {
      const rate = body.profit_tax_rate
      if (rate !== null && (typeof rate !== 'number' || rate < 0 || rate > 100)) {
        return NextResponse.json({ error: '稅率須 0-100' }, { status: 400 })
      }

      // 撈既有 row
      const { data: existing } = await supabase
        .from('workspace_bonus_defaults')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('type', BonusSettingType.PROFIT_TAX)
        .maybeSingle()
      const existingId = (existing as { id: string } | null)?.id ?? null

      if (rate === null) {
        // null = 刪除（不扣稅）
        if (existingId) {
          const { error } = await supabase
            .from('workspace_bonus_defaults')
            .delete()
            .eq('id', existingId)
          if (error) {
            const t = translateDbError(error)
            return NextResponse.json({ error: t.message }, { status: t.httpStatus })
          }
        }
        return NextResponse.json({
          success: true,
          profit_tax_rate_row_id: null,
          profit_tax_rate: null,
        })
      }

      if (existingId) {
        const { error } = await supabase
          .from('workspace_bonus_defaults')
          .update({ bonus: rate, bonus_type: BonusCalculationType.PERCENT })
          .eq('id', existingId)
        if (error) {
          const t = translateDbError(error)
          return NextResponse.json({ error: t.message }, { status: t.httpStatus })
        }
        return NextResponse.json({
          success: true,
          profit_tax_rate_row_id: existingId,
          profit_tax_rate: rate,
        })
      }

      const { data: inserted, error } = await supabase
        .from('workspace_bonus_defaults')
        .insert({
          workspace_id: workspaceId,
          type: BonusSettingType.PROFIT_TAX,
          bonus: rate,
          bonus_type: BonusCalculationType.PERCENT,
          employee_id: null,
          description: '結帳稅率（公司預設、新團獎金結算自動帶入）',
        })
        .select('id')
        .single()
      if (error) {
        const t = translateDbError(error)
        return NextResponse.json({ error: t.message }, { status: t.httpStatus })
      }
      return NextResponse.json({
        success: true,
        profit_tax_rate_row_id: (inserted as { id: string }).id,
        profit_tax_rate: rate,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('company-settings PATCH 失敗', { workspaceId, err })
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
