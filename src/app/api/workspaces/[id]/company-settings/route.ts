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
 * 公司結帳設定 partial update：
 *   - transfer_fee_mode：寫進 workspaces 表
 *   - profit_tax_rate：upsert workspace_bonus_defaults 的 PROFIT_TAX row（null = 刪除 = 不扣稅）
 *
 * 2026-05-19 加：對齊紅線 F、client 不直接 supabase write、走 API route。
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  let body: {
    transfer_fee_mode?: 'average' | 'unified'
    profit_tax_rate?: number | null
    logo_scale?: number
    logo_offset_x?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
  }

  try {
    // 1. transfer_fee_mode：直接寫 workspaces 表
    if (body.transfer_fee_mode !== undefined) {
      if (body.transfer_fee_mode !== 'average' && body.transfer_fee_mode !== 'unified') {
        return NextResponse.json({ error: '無效的手續費模式' }, { status: 400 })
      }
      const { error } = await supabase
        .from('workspaces')
        .update({ transfer_fee_mode: body.transfer_fee_mode })
        .eq('id', workspaceId)
      if (error) {
        const t = translateDbError(error)
        return NextResponse.json({ error: t.message }, { status: t.httpStatus })
      }
    }

    // 1b. logo_scale / logo_offset_x：Logo 在 PrintHeader 內的位置 + 縮放
    // 範圍 logo_scale 0.5-2.0(DB 有 CHECK constraint 兜底)、logo_offset_x 容許負值
    const logoPatch: Record<string, number> = {}
    if (body.logo_scale !== undefined) {
      const s = body.logo_scale
      if (typeof s !== 'number' || !Number.isFinite(s) || s < 0.5 || s > 2.0) {
        return NextResponse.json({ error: 'logo_scale 範圍 0.5-2.0' }, { status: 400 })
      }
      logoPatch.logo_scale = s
    }
    if (body.logo_offset_x !== undefined) {
      const x = body.logo_offset_x
      if (typeof x !== 'number' || !Number.isInteger(x) || x < -200 || x > 800) {
        return NextResponse.json({ error: 'logo_offset_x 範圍 -200 到 800' }, { status: 400 })
      }
      logoPatch.logo_offset_x = x
    }
    if (Object.keys(logoPatch).length > 0) {
      const { error } = await supabase
        .from('workspaces')
        .update(logoPatch)
        .eq('id', workspaceId)
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
