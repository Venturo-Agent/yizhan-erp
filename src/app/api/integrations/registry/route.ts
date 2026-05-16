/**
 * /api/integrations/registry
 *
 * 公開查詢 integration definition、供 setup 頁渲染 form 用。
 * 不含 sensitive 資料、只是 schema (name / fields / hints 等)。
 *
 * 設計：2026-05-14 Logan
 */

import { NextRequest, NextResponse } from 'next/server'
import { INTEGRATIONS, getIntegrationByCode } from '@/lib/integrations/registry'
import { apiHandler } from '@/lib/api/api-handler'

export const GET = apiHandler(async (request: NextRequest) => {
  const code = request.nextUrl.searchParams.get('code')

  if (code) {
    const def = getIntegrationByCode(code)
    if (!def) {
      return NextResponse.json({ error: `未知 integration_code: ${code}` }, { status: 404 })
    }
    return NextResponse.json(def)
  }

  // 不帶 code 列全部（給 admin / debug 用）
  return NextResponse.json(INTEGRATIONS)
})
