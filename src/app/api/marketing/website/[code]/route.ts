/**
 * PUT /api/marketing/website/[code]
 *
 * 更新某團的「官網管理」欄位（marketing_* / seo_* / hero_image_url / is_public_listed）。
 * 只動官網欄位、不碰團務內部欄位（行程 / 報價 / 合約 / 鎖團等）。
 *
 * 為什麼分獨立 route 不複用 /api/tours/[code]：
 *   - /api/tours/[code]（如有）會碰大量團務欄位、需 tours.write capability
 *   - 行銷編輯是另一個業務角色（行銷 / 業務助理）、走 marketing.website.write capability
 *   - 寫入欄位白名單也不同、混在一起容易誤更新
 *
 * 守門：
 *   - requireCapability(marketing.website.write)
 *   - workspace_id check（限自己 workspace 的團才能改）
 *   - 紅線 B：published_by 設成 employees.id、不是 auth.users.id
 *   - 紅線 C：per-request admin client（getSupabaseAdminClient 每次新建）
 *   - 紅線 D：本 route 不能改「已封存 / 已結團」狀態、但「上架」不算改帳、所以允許
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { resolveEmployeeIdFromUser } from '@/app/api/lib/resolve-employee'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'

/**
 * 允許更新的欄位白名單（防 client 偷塞其他欄位）
 */
const ALLOWED_FIELDS = [
  'marketing_title',
  'marketing_subtitle',
  'marketing_body',
  'hero_image_url',
  'seo_title',
  'seo_description',
  'is_public_listed',
] as const

type AllowedField = (typeof ALLOWED_FIELDS)[number]

interface PutBody {
  marketing_title?: string | null
  marketing_subtitle?: string | null
  marketing_body?: string | null
  hero_image_url?: string | null
  seo_title?: string | null
  seo_description?: string | null
  is_public_listed?: boolean
  /** true = 同時設 published_at=now() + published_by=current employee（「儲存並上架」用） */
  publish_now?: boolean
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const guard = await requireCapability(CAPABILITIES.MARKETING_WEBSITE_WRITE)
    if (!guard.ok) return guard.response

    const { code } = await params
    if (!code) {
      return NextResponse.json({ error: '缺少團號' }, { status: 400 })
    }

    const body = (await request.json()) as PutBody

    // Per-request admin client（紅線 C）
    const adminClient = getSupabaseAdminClient()

    // 1. 找對應 tour、確認屬於 caller 的 workspace
    //    用 admin client 是因為要繞 RLS 取 workspace_id 比對（直接 RLS 也行、但回 row not found 訊息不清楚）
    const { data: tour, error: tourError } = await adminClient
      .from('tours')
      .select('id, workspace_id')
      .eq('code', code)
      .maybeSingle()

    if (tourError) {
      return dbErrorResponse(tourError)
    }
    if (!tour) {
      return NextResponse.json({ error: '找不到該旅遊團' }, { status: 404 })
    }
    if (tour.workspace_id !== guard.workspaceId) {
      // 跨 workspace 假裝 not found（不洩漏其他 workspace 有沒有此團號）
      return NextResponse.json({ error: '找不到該旅遊團' }, { status: 404 })
    }

    // 2. 解析 employee id（紅線 B：published_by FK 指 employees.id）
    const serverClient = await createSupabaseServerClient()
    const {
      data: { session },
    } = await serverClient.auth.getSession()
    const userId = session?.user.id
    const employeeId = userId ? await resolveEmployeeIdFromUser(serverClient, userId) : null
    const actorId = employeeId ?? guard.employeeId

    // 3. audit context
    await recordApiAuditContext(adminClient, {
      actorId,
      reason: `更新官網行程上架資訊（${code}）`,
    })

    // 4. 組 update payload（只取白名單欄位）
    const updatePayload: Record<string, unknown> = {
      updated_by: actorId,
    }
    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        updatePayload[field as AllowedField] = body[field as AllowedField]
      }
    }

    // 5. publish_now = true 時、設 published_at / published_by、強制 is_public_listed=true
    if (body.publish_now === true) {
      updatePayload.is_public_listed = true
      updatePayload.published_at = new Date().toISOString()
      updatePayload.published_by = actorId
    }

    // 6. 寫入
    const { data: updated, error: updateError } = await adminClient
      .from('tours')
      .update(updatePayload)
      .eq('id', tour.id)
      .select(
        'id, code, name, is_public_listed, marketing_title, marketing_subtitle, marketing_body, hero_image_url, seo_title, seo_description, published_at, published_by'
      )
      .single()

    if (updateError) {
      return dbErrorResponse(updateError)
    }

    return NextResponse.json({ data: updated, ok: true })
  } catch (error) {
    logger.error('PUT /api/marketing/website/[code] error', error)
    return dbErrorResponse(error)
  }
}
