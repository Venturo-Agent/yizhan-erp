import { captureException } from '@/lib/error-tracking'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { ApiError } from '@/lib/api/response'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateBody } from '@/lib/api/validation'
import { validateLoginSchema } from '@/lib/validations/api-schemas'

/**
 * 故意不守 requireCapability：登入端點本身就是身份驗證、不能守 capability（迴圈）
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 Rate limiting: 10 requests per minute (login attempts)
    const rateLimited = await checkRateLimit(request, 'validate-login', 10, 60_000)
    if (rateLimited) return rateLimited

    const validation = await validateBody(request, validateLoginSchema)
    if (!validation.success) return validation.error
    const { email, password, code } = validation.data

    const supabase = getSupabaseAdminClient()
    // 1. 查詢 workspace（統一大寫）
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id, code, name, premium_enabled')
      .eq('code', code.trim().toUpperCase())
      .maybeSingle()

    if (wsError) {
      logger.error('Workspace query error:', wsError)
      return ApiError.internal('系統錯誤')
    }

    // 安全考量：找不到 workspace 時、回與帳密錯誤相同訊息、避免被列舉公司代號
    if (!workspace) {
      return ApiError.unauthorized('公司代號、Email 或密碼錯誤，請確認後再試')
    }

    // 2. 查詢員工（用 email、大小寫不敏感）
    // 安全考量：純 email 登入、不再保留 employee_number fallback、避免攻擊者用短編號窮舉
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select(
        'id, employee_number, display_name, english_name, avatar_url, status, user_id, workspace_id, role_id, job_info, created_at, updated_at, login_failed_count, login_locked_until, must_change_password'
      )
      .eq('workspace_id', workspace.id)
      .ilike('email', email.trim())
      .maybeSingle()

    if (empError) {
      logger.error('Employee query error:', empError)
      return ApiError.internal('系統錯誤')
    }

    if (!employee) {
      return ApiError.unauthorized('公司代號、Email 或密碼錯誤，請確認後再試')
    }

    // 3. 檢查帳號狀態
    if (employee.status === 'terminated') {
      return ApiError.unauthorized('此帳號已停用')
    }

    // 3.5 檢查帳號鎖定狀態（5 次失敗鎖定 15 分鐘）
    const lockedUntil = employee.login_locked_until
    if (lockedUntil && new Date(lockedUntil) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60_000)
      return ApiError.unauthorized(`帳號已鎖定，請 ${remainingMinutes} 分鐘後再試`)
    }

    // 4. 從 auth.users 取得這位員工的登入 email（單一來源、不再 fallback）
    if (!employee.user_id) {
      logger.warn(`Employee ${employee.employee_number}@${code} 缺少 user_id、無法登入`)
      return ApiError.unauthorized('帳號設定不完整、請聯絡系統主管')
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(employee.user_id)
    const authEmail = authUser?.user?.email

    if (!authEmail) {
      logger.error(
        `Auth user ${employee.user_id} (employee ${employee.employee_number}) 無 email、登入卡住`
      )
      return ApiError.unauthorized('帳號認證資料異常、請聯絡系統主管')
    }

    // 5. 用 RPC 純驗證密碼、不產 session（client 端 signInWithPassword 是唯一產 session 的地方）
    // 避免雙重登入：API + client 都跑 signInWithPassword 會讓 cookie 被 set 兩次
    const { data: passwordValid, error: rpcError } = await supabase.rpc('verify_auth_password', {
      p_user_id: employee.user_id,
      p_password: password,
    })

    if (rpcError || !passwordValid) {
      // 登入失敗：累加失敗計數
      const currentFailCount = employee.login_failed_count || 0
      const newFailCount = currentFailCount + 1
      const MAX_FAILED_ATTEMPTS = 5
      const LOCKOUT_MINUTES = 15

      const updateData: Record<string, unknown> = { login_failed_count: newFailCount }
      if (newFailCount >= MAX_FAILED_ATTEMPTS) {
        updateData.login_locked_until = new Date(
          Date.now() + LOCKOUT_MINUTES * 60_000
        ).toISOString()
        logger.warn(
          `🔒 帳號 ${email}@${code} 已鎖定 ${LOCKOUT_MINUTES} 分鐘（連續 ${newFailCount} 次失敗）`
        )
      }

      await supabase.from('employees').update(updateData).eq('id', employee.id)

      return ApiError.unauthorized('公司代號、Email 或密碼錯誤，請確認後再試')
    }

    // 登入成功：重置失敗計數
    if ((employee.login_failed_count ?? 0) > 0) {
      await supabase
        .from('employees')
        .update({ login_failed_count: 0, login_locked_until: null })
        .eq('id', employee.id)
    }

    // 6. 回傳員工資料 + auth email（SELECT 已不含 password_hash）
    const employeeData = employee

    // 7. 同時查 capabilities + features、讓 client 不用再打 /api/auth/layout-context
    // fail-soft：query 失敗時回空陣列、不擋登入（client 會 fallback 到 layout-context API）
    let capabilities: string[] = []
    let features: string[] = []
    try {
      const [featuresRes, capsRes] = await Promise.all([
        supabase
          .from('workspace_features')
          .select('feature_code, enabled')
          .eq('workspace_id', employee.workspace_id!),
        employee.role_id
          ? supabase
              .from('role_capabilities')
              .select('capability_code, enabled')
              .eq('role_id', employee.role_id)
              .eq('enabled', true)
          : Promise.resolve({
              data: [] as { capability_code: string; enabled: boolean }[] | null,
              error: null,
            }),
      ])

      if (featuresRes.error) {
        logger.error('Workspace features query error:', {
          error: featuresRes.error,
          workspace_id: employee.workspace_id,
        })
      } else {
        features = (featuresRes.data ?? [])
          .filter((f): f is { feature_code: string; enabled: boolean } => !!f.enabled)
          .map(f => f.feature_code)
      }

      if ('error' in capsRes && capsRes.error) {
        logger.error('Role capabilities query error:', {
          error: capsRes.error,
          role_id: employee.role_id,
        })
      } else {
        capabilities = (capsRes.data ?? []).filter(c => c.enabled).map(c => c.capability_code)
      }
    } catch (capsErr) {
      logger.error('Capabilities/features fetch failed (non-fatal):', {
        error:
          capsErr instanceof Error ? { message: capsErr.message, stack: capsErr.stack } : capsErr,
        workspace_id: employee.workspace_id,
        role_id: employee.role_id,
      })
      // 繼續、capabilities/features 保持空、client fallback 到 layout-context API
    }

    const mustChangePassword = employee.must_change_password === true

    // 寫 cookie 標「當前 workspace」、給 get-layout-context 篩用（user 多 workspace 時）
    // 不然 user_id 對到多筆 employee（漫途平台主管 + 租戶員工）會抓錯筆、sidebar 全 hide
    const response = NextResponse.json({
      success: true,
      data: {
        employee: employeeData,
        workspace: {
          id: workspace.id,
          code: workspace.code,
          name: workspace.name,
          premium_enabled: workspace.premium_enabled ?? false,
        },
        authEmail,
        mustChangePassword,
        capabilities,
        features,
        // 補帶 premium_enabled、解 sidebar 看不到 accounting/customers 等 premium feature 的問題
        premium_enabled: workspace.premium_enabled ?? false,
      },
    })
    response.cookies.set('venturo-workspace-id', workspace.id, {
      httpOnly: true, // 改 true、確認 client 端無人讀（只 get-layout-context server side 讀）
      sameSite: 'lax', // strict 會在外部 link 點進來時丟失、保留 lax
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 天
    })
    return response
  } catch (error) {
    logger.error('Validate login error:', {
      error:
        error instanceof Error
          ? { message: error.message, stack: error.stack, name: error.name }
          : error,
    })
    captureException(error, { module: 'auth.validate-login' })
    return ApiError.internal('系統錯誤')
  }
}
