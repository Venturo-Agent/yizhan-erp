/**
 * requireCapability — API route 統一守門 helper
 *
 * 用法：
 *   export async function GET(req: NextRequest) {
 *     const ctx = await requireCapability(CAPABILITIES.TOURS_READ)
 *     if (!ctx.ok) return ctx.response
 *     // ...業務邏輯、ctx.workspaceId / ctx.employeeId 已驗證
 *   }
 *
 * 跟 getApiContext 不同：
 *   - getApiContext 是「拿 context、檢查 capability」、回完整資訊
 *   - requireCapability 是「快速守門」、只關心過 / 不過
 *
 * 守門邏輯：
 *   1. 必須登入（getServerAuth）
 *   2. 必須有指定 capability（hasCapabilityByCode）
 *   3. 失敗回 401 / 403、成功回 { ok: true, workspaceId, employeeId }
 */

import { NextResponse } from 'next/server'
import { getServerAuth } from './server-auth'

type RequireCapabilityResult =
  | { ok: true; workspaceId: string; employeeId: string }
  | { ok: false; response: NextResponse }

export async function requireCapability(
  capabilityCode: string
): Promise<RequireCapabilityResult> {
  const auth = await getServerAuth()
  if (!auth.success) {
    return {
      ok: false,
      response: NextResponse.json({ error: '請先登入' }, { status: 401 }),
    }
  }

  const { hasCapabilityByCode } = await import('@/app/api/lib/check-capability')
  const allowed = await hasCapabilityByCode(auth.data.employeeId, capabilityCode)

  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `沒有 ${capabilityCode} 權限` },
        { status: 403 }
      ),
    }
  }

  return {
    ok: true,
    workspaceId: auth.data.workspaceId,
    employeeId: auth.data.employeeId,
  }
}
