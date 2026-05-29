import { NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'
import { getServerAuth } from '@/lib/auth/server-auth'
import { logger } from '@/lib/utils/logger'
import { dbErrorResponse } from '@/lib/db-error-translate'

/**
 * /api/branches — 分公司列表（GET only）
 *
 * GET：列出所有分公司（同租戶員工都能看、給 select 下拉用）
 *      RLS 守 SELECT、API 不必再檢查
 *
 * 註：新增分公司走正式 API /api/organization/branches（需填代碼 + 8 碼統編）。
 *     原本的 POST「快速新增」（只填名字）2026-05-27 已移除：
 *     branches 表 code / tax_id 為 NOT NULL，只填名字本就不可能成功，且 UI 無入口（dead code）。
 */

export async function GET() {
  try {
    // 最低守門：確認登入。內容由 RLS 過濾、同租戶員工都能讀
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }
    const supabase = await createApiClient()
    const { data, error } = await supabase
      .from('branches')
      .select('id, name, code, display_order, tax_id, type')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) return dbErrorResponse(error)
    return NextResponse.json(data ?? [])
  } catch (e) {
    logger.error('GET /api/branches failed', e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
