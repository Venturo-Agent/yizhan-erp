import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

// ============================================
// Supabase Browser Client（使用 cookies 存 session）
// ============================================
// 使用 @supabase/ssr 的 createBrowserClient，這樣：
// 1. Session 會自動存到 cookies（而不是 localStorage）
// 2. Server 端（API Routes）可以透過 cookies 讀取 session
// 3. getServerAuth() 能正常運作
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// 單例模式：確保整個應用只有一個 client 實例
let supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

function getSupabaseBrowserClient() {
  if (supabaseInstance) {
    return supabaseInstance
  }

  supabaseInstance = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

  // 修 supabase-js + @supabase/ssr 的 INITIAL_SESSION 漏接 bug：
  //   cookie session 恢復時 fire 'INITIAL_SESSION'、library 內部 _handleTokenChanged
  //   只處理 SIGNED_IN / TOKEN_REFRESHED / SIGNED_OUT、INITIAL_SESSION 被丟掉、
  //   結果 realtime websocket 用 anon token 連線、postgres_changes 對 RLS table
  //   永遠收不到 event（要 reload SWR 才看得到別人的訊息 / 自己訊息也 race）。
  //   解：建 client 時立刻撈一次 session、push 給 realtime。fire-and-forget、不擋同步 export。
  //   後續 TOKEN_REFRESHED 由 supabase-js 內部自動處理、不用我們煩。
  if (typeof window !== 'undefined') {
    void supabaseInstance.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        supabaseInstance!.realtime.setAuth(data.session.access_token)
      }
    })
  }

  return supabaseInstance
}

// 匯出單例供全應用使用
export const supabase = getSupabaseBrowserClient()

// 為了向後兼容，保留這個函數（但現在它返回同一個單例）
export function createSupabaseBrowserClient() {
  return getSupabaseBrowserClient()
}
