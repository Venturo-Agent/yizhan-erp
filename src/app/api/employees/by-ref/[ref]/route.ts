import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getServerAuth } from '@/lib/auth/server-auth'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  try {
    // 🔒 必須登入 + 限定當前 workspace、防止跨租戶枚舉員工
    const guard = await requireCapability(CAPABILITIES.HR_READ_EMPLOYEES)
    if (!guard.ok) return guard.response
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }
    const workspaceId = auth.data.workspaceId

    const { ref } = await params

    const supabase = getSupabaseAdminClient()

    // 先用 employee_number 查（限定 workspace）
    let { data, error } = await supabase
      .from('employees')
      .select(
        'id, employee_number, display_name, english_name, avatar_url, status, workspace_id'
      )
      .eq('workspace_id', workspaceId)
      .eq('employee_number', ref)
      .single()

    // 如果查不到，用 display_name 查（同樣限定 workspace）
    if (!data) {
      const result = await supabase
        .from('employees')
        .select(
          'id, employee_number, display_name, english_name, avatar_url, status, workspace_id'
        )
        .eq('workspace_id', workspaceId)
        .eq('display_name', ref)
        .single()
      data = result.data
      error = result.error
    }

    if (error || !data) {
      return NextResponse.json({ error: '找不到業務' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    logger.error('API Error', { path: request.nextUrl.pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}
