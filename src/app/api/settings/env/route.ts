import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { canManageRoles } from '@/app/api/lib/check-capability'
import { getServerAuth } from '@/lib/auth/server-auth'
import { ApiError, successResponse } from '@/lib/api/response'
import { requireCapability } from '@/lib/auth/require-capability'
import { CAPABILITIES } from '@/lib/permissions/capabilities'

/**
 * API 設定資訊端點
 * 🔒 需要管理員資格、只顯示是否已設定（不暴露實際值）
 */

interface ApiConfig {
  name: string
  description: string
  envKey: string
  isConfigured: boolean // 改為只顯示是否已設定
  docsUrl?: string
  consoleUrl?: string
  usageInfo?: string
  category: 'database' | 'ocr' | 'ai' | 'payment' | 'flight' | 'other'
}

// 獲取 API 使用量
async function getApiUsage(apiName: string, monthlyLimit: number): Promise<string | undefined> {
  try {
    const supabase = getSupabaseAdminClient()

    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data } = await supabase
      .from('api_usage')
      .select('usage_count')
      .eq('api_name', apiName)
      .eq('month', currentMonth)
      .single()

    if (data) {
      return `本月已使用 ${data.usage_count}/${monthlyLimit} 次`
    }
    return '本月尚未使用'
  } catch {
    return undefined
  }
}

// 獲取 Google Vision 使用量
async function getGoogleVisionUsage(): Promise<string | undefined> {
  return getApiUsage('google_vision', 980)
}

// 獲取 Gemini 使用量
async function getGeminiUsage(): Promise<string | undefined> {
  return getApiUsage('gemini', 1500) // 每分鐘 60 次，保守估算每日 50 次 × 30 天
}


export async function GET() {
  // 🔒 安全檢查：要有 settings.env.write capability（系統環境變數管理）
  const guard = await requireCapability(CAPABILITIES.MANAGE_ENV_SETTINGS)
  if (!guard.ok) return guard.response
  const auth = await getServerAuth()
  if (!auth.success) {
    return ApiError.unauthorized('請先登入')
  }

  // 🔒 檢查員工是否擁有管理角色的 capability（hr.roles.write）
  const isAdmin = await canManageRoles(auth.data.employeeId)
  if (!isAdmin) {
    return ApiError.forbidden('您沒有此權限')
  }

  const googleVisionUsage = await getGoogleVisionUsage()
  const geminiUsage = await getGeminiUsage()

  // 🔒 安全修復：只顯示是否已設定，不暴露實際值
  const configs: ApiConfig[] = [
    // Supabase
    {
      name: 'Supabase URL',
      description: 'Supabase 專案的 API 端點',
      envKey: 'NEXT_PUBLIC_SUPABASE_URL',
      isConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      consoleUrl: 'https://supabase.com/dashboard',
      docsUrl: 'https://supabase.com/docs',
      category: 'database',
    },
    {
      name: 'Supabase Anon Key',
      description: '公開 API 金鑰，用於前端查詢（受 RLS 保護）',
      envKey: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      isConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      consoleUrl: 'https://supabase.com/dashboard/project/_/settings/api',
      category: 'database',
    },
    {
      name: 'Supabase Service Role Key',
      description: '服務角色金鑰，用於後端管理操作（繞過 RLS）',
      envKey: 'SUPABASE_SERVICE_ROLE_KEY',
      isConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      consoleUrl: 'https://supabase.com/dashboard/project/_/settings/api',
      category: 'database',
    },
    {
      name: 'Supabase Access Token',
      description: 'Personal Access Token，用於 CLI 操作和 Migration',
      envKey: 'SUPABASE_ACCESS_TOKEN',
      isConfigured: !!process.env.SUPABASE_ACCESS_TOKEN,
      consoleUrl: 'https://supabase.com/dashboard/account/tokens',
      category: 'database',
    },

    // OCR
    {
      name: 'OCR.space API Key',
      description: '護照 OCR 辨識服務（MRZ 解析）',
      envKey: 'OCR_SPACE_API_KEY',
      isConfigured: !!process.env.OCR_SPACE_API_KEY,
      consoleUrl: 'https://ocr.space/ocrapi/freekey',
      docsUrl: 'https://ocr.space/OCRAPI',
      usageInfo: '免費額度：25,000 次/月',
      category: 'ocr',
    },
    {
      name: 'Google Vision API Key',
      description: '中文文字辨識服務（護照中文名字）',
      envKey: 'GOOGLE_VISION_API_KEY',
      isConfigured: !!process.env.GOOGLE_VISION_API_KEY,
      consoleUrl: 'https://console.cloud.google.com/apis/credentials',
      docsUrl: 'https://cloud.google.com/vision/docs',
      usageInfo: googleVisionUsage || '免費額度：1,000 次/月（限制 980 次）',
      category: 'ocr',
    },

    // AI
    {
      name: 'Gemini API Key',
      description: 'Google Gemini AI 文字理解與結構化辨識',
      envKey: 'GEMINI_API_KEY',
      isConfigured: !!process.env.GEMINI_API_KEY,
      consoleUrl: 'https://aistudio.google.com/app/apikey',
      docsUrl: 'https://ai.google.dev/docs',
      usageInfo: geminiUsage || '免費額度：60 次/分鐘（每日約 1,500 次）',
      category: 'ai',
    },

    // 航班查詢
    {
      name: 'AeroDataBox API Key',
      description: '航班查詢與機場時刻表服務（RapidAPI）',
      envKey: 'AERODATABOX_API_KEY',
      isConfigured: !!process.env.AERODATABOX_API_KEY,
      consoleUrl: 'https://rapidapi.com/aedbx-aedbx/api/aerodatabox',
      docsUrl: 'https://aerodatabox.com/',
      usageInfo: '免費額度：300 次/月',
      category: 'flight',
    },

    // 應用設定（這些是公開設定，可以顯示值）
    {
      name: 'App URL',
      description: '應用程式的公開網址',
      envKey: 'NEXT_PUBLIC_APP_URL',
      isConfigured: !!process.env.NEXT_PUBLIC_APP_URL,
      category: 'other',
    },
    {
      name: 'App Name',
      description: '應用程式名稱',
      envKey: 'NEXT_PUBLIC_APP_NAME',
      isConfigured: !!process.env.NEXT_PUBLIC_APP_NAME,
      category: 'other',
    },
    {
      name: '啟用 Supabase',
      description: '是否連接雲端資料庫',
      envKey: 'NEXT_PUBLIC_ENABLE_SUPABASE',
      isConfigured: process.env.NEXT_PUBLIC_ENABLE_SUPABASE === 'true',
      category: 'other',
    },
    {
      name: 'Debug 模式',
      description: '是否顯示除錯訊息',
      envKey: 'NEXT_PUBLIC_DEBUG_MODE',
      isConfigured: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
      category: 'other',
    },
  ]

  return successResponse({ configs })
}
