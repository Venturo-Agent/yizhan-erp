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
  return supabaseInstance
}

// 匯出單例供全應用使用
export const supabase = getSupabaseBrowserClient()

// 為了向後兼容，保留這個函數（但現在它返回同一個單例）
export function createSupabaseBrowserClient() {
  return getSupabaseBrowserClient()
}
