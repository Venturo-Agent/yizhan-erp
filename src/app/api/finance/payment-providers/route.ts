/**
 * GET /api/finance/payment-providers
 *
 * 列出平台層金流商（manual + sinopac_card / sinopac_collect / sinopac_apple_pay / ...）
 * 給收款方式設定 dialog 的 provider 下拉用。
 *
 * 守門：登入即可（reference data、所有 finance.read.* role 都會用）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'
import { getServerAuth } from '@/lib/auth/server-auth'
import { dbErrorResponse } from '@/lib/db-error-translate'
import { apiHandler } from '@/lib/api/api-handler'

export const GET = apiHandler(async (request: NextRequest) => {
  const auth = await getServerAuth()
  if (!auth.success) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const supabase = await createApiClient()
  const searchParams = request.nextUrl.searchParams
  const includeDisabled = searchParams.get('include_disabled') === 'true'

  let query = supabase
    .from('platform_payment_providers')
    .select('code, provider_name, provider_kind, enabled, description')
    .order('code')

  if (!includeDisabled) {
    query = query.eq('enabled', true)
  }

  const { data, error } = await query

  if (error) {
    return dbErrorResponse(error)
  }

  return NextResponse.json(data ?? [])
})
