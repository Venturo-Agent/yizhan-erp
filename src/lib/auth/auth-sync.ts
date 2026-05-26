/**
 * Auth 同步抽象層
 *
 * 確保前端 Auth Store 和 Supabase Auth 保持同步
 * 解決 RLS 需要 user_id 的問題
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

interface SyncState {
  isSynced: boolean
  lastSyncAt: string | null
  error: string | null
}

let syncState: SyncState = {
  isSynced: false,
  lastSyncAt: null,
  error: null,
}

let syncPromise: Promise<boolean> | null = null

/**
 * 同步員工的 user_id
 * 使用 API 繞過 RLS 限制
 */
async function syncEmployeeToSupabase(
  employeeId: string,
  userId: string,
  workspaceId: string,
  accessToken?: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/sync-employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: employeeId,
        user_id: userId,
        workspace_id: workspaceId,
        access_token: accessToken,
      }),
    })

    if (response.ok) {
      logger.log('✅ Auth 同步成功:', userId)
      syncState = {
        isSynced: true,
        lastSyncAt: new Date().toISOString(),
        error: null,
      }
      return true
    } else {
      const error = await response.json()
      logger.warn('⚠️ Auth 同步失敗:', error)
      syncState = {
        isSynced: false,
        lastSyncAt: null,
        error: error.message || 'sync failed',
      }
      return false
    }
  } catch (error) {
    logger.error('❌ Auth 同步錯誤:', error)
    syncState = {
      isSynced: false,
      lastSyncAt: null,
      error: String(error),
    }
    return false
  }
}

interface SyncOptions {
  employeeId?: string
  workspaceId?: string
}

/**
 * 帶 timeout 的 getSession wrapper
 * 避免 getSession 掛住導致整個應用卡住
 */
async function getSessionWithTimeout(timeoutMs: number = 10000): Promise<{
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] | null
  error: Error | null
}> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('getSession timeout')), timeoutMs)
    })

    const sessionPromise = supabase.auth.getSession()
    const { data, error } = await Promise.race([sessionPromise, timeoutPromise])

    if (error) {
      return { session: null, error }
    }
    return { session: data.session, error: null }
  } catch (err) {
    // timeout 是正常情況（網路慢），不需要警告用戶
    logger.debug('getSession timeout or slow response')
    return { session: null, error: err instanceof Error ? err : new Error(String(err)) }
  }
}

/**
 * 檢查並確保 Auth 同步
 * 這是主要的入口點，會在以下情況被調用：
 * 1. 應用初始化時
 * 2. Session 恢復時
 * 3. 登入時（傳入 options）
 * 4. 手動觸發時
 */
export async function ensureAuthSync(options?: SyncOptions): Promise<boolean> {
  // 如果已經同步過且沒有傳入新的 options，直接返回（避免閒置時重複檢查）
  if (syncState.isSynced && !options) {
    return true
  }

  // 避免重複同步
  if (syncPromise) {
    return syncPromise
  }

  syncPromise = (async () => {
    try {
      // 1. 檢查 Supabase session (帶 timeout 保護)
      const { session, error: sessionError } = await getSessionWithTimeout()

      if (sessionError || !session) {
        logger.debug('無 Supabase session，跳過同步')
        syncState.isSynced = false
        return false
      }

      const userId = session.user.id

      // 2. 取得員工資訊（優先使用傳入的 options，否則從 localStorage）
      let employeeId = options?.employeeId
      let workspaceId = options?.workspaceId

      if (!employeeId || !workspaceId) {
        const authStorage = localStorage.getItem('auth-storage')
        if (authStorage) {
          const authData = JSON.parse(authStorage)
          const user = authData?.state?.user
          employeeId = employeeId || user?.id
          workspaceId = workspaceId || user?.workspace_id
        }
      }

      if (!employeeId || !workspaceId) {
        return false
      }

      // 3. 檢查資料庫中是否已經有正確的 user_id
      const { data: employee, error: checkError } = await supabase
        .from('employees')
        .select('id, user_id, workspace_id')
        .eq('id', employeeId)
        .maybeSingle()

      // 如果查詢失敗（可能因為 RLS），直接嘗試同步
      if (checkError) {
        return await syncEmployeeToSupabase(employeeId, userId, workspaceId, session.access_token)
      }

      // 4. 如果 user_id 已經正確，不需要同步
      if (employee?.user_id === userId) {
        syncState = {
          isSynced: true,
          lastSyncAt: new Date().toISOString(),
          error: null,
        }
        return true
      }

      // 5. 需要同步
      logger.log('🔄 執行 Auth 同步...')
      return await syncEmployeeToSupabase(employeeId, userId, workspaceId, session.access_token)
    } catch (error) {
      logger.error('❌ ensureAuthSync 錯誤:', error)
      syncState = {
        isSynced: false,
        lastSyncAt: null,
        error: String(error),
      }
      return false
    } finally {
      syncPromise = null
    }
  })()

  return syncPromise
}

/**
 * 取得同步狀態
 */
function _getAuthSyncState(): SyncState {
  return { ...syncState }
}

/**
 * 重置同步狀態（登出時使用）
 */
export function resetAuthSyncState(): void {
  syncState = {
    isSynced: false,
    lastSyncAt: null,
    error: null,
  }
  syncPromise = null
}

/**
 * 設定 Auth 狀態監聽器
 *
 * 處理兩件事：
 * 1. SIGNED_OUT 時重置 sync state
 * 2. SIGNED_IN / TOKEN_REFRESHED / INITIAL_SESSION 時、把 JWT push 給 realtime client
 *    這條是 @supabase/ssr 的 known gap：cookie session 走 REST 自動帶 token、
 *    但 realtime websocket 預設用 anon token、不會跟 cookie sync。
 *    沒這條 → realtime postgres_changes 對 RLS table 收不到任何 event。
 */
function setupAuthSyncListener(): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      supabase.realtime.setAuth(null)
      resetAuthSyncState()
      return
    }

    if (session?.access_token) {
      supabase.realtime.setAuth(session.access_token)
    }
  })

  return () => {
    subscription.unsubscribe()
  }
}

/**
 * 初始化 Auth 同步系統
 *
 * 1. 設定 onAuthStateChange listener（含 realtime token sync）
 * 2. 開機先撈一次 session、有就立刻 push 給 realtime
 *    修頁面初次 hydrate 時 race condition：listener 還沒掛上、session 已存在 cookie
 */
let isInitialized = false

export function initAuthSync(): void {
  if (isInitialized || typeof window === 'undefined') {
    return
  }

  isInitialized = true

  setupAuthSyncListener()

  // 開機 token 初始化、不擋主流程
  void supabase.auth.getSession().then(({ data }) => {
    if (data.session?.access_token) {
      supabase.realtime.setAuth(data.session.access_token)
    }
  })
}
