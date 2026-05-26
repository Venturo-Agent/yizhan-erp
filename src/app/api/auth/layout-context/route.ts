/**
 * GET /api/auth/layout-context
 *
 * 一次回傳整個 session 需要的東西：employee + workspace + capabilities + features
 *
 * 取代過去登入後散落的多次獨立 fetch：
 *   - /api/permissions/features
 *   - /api/workspaces/[id]
 *   - 直接 query role_capabilities
 *
 * Client 端用 useLayoutContext() 走 SWR 包裝、整 session cache 一份。
 */

import { NextResponse } from 'next/server'
import { getLayoutContext } from '@/lib/auth/get-layout-context'
import { apiHandler } from '@/lib/api/api-handler'

/**
 * 故意不守 requireCapability：登入後 layout context、不需 capability
 */
export const GET = apiHandler(async () => {
  const ctx = await getLayoutContext()

  if (!ctx.user || !ctx.workspace_id) {
    return NextResponse.json(
      {
        ok: false,
        user: null,
        employee: null,
        workspace: null,
        capabilities: [] as string[],
        features: [] as string[],
        premium_enabled: false,
      },
      { status: 200 }
    )
  }

  return NextResponse.json({
    ok: true,
    user: { id: ctx.user.id, email: ctx.user.email ?? null },
    employee: ctx.employee,
    workspace: ctx.workspace,
    role_id: ctx.role_id,
    workspace_id: ctx.workspace_id,
    capabilities: Array.from(ctx.capabilities),
    features: Array.from(ctx.features),
    premium_enabled: ctx.premium_enabled,
  })
})
