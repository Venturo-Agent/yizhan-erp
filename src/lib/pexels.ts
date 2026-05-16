/**
 * Pexels API 工具
 *
 * 提供免費圖庫搜尋功能
 * API key 存在 server-only 環境變數 PEXELS_API_KEY（不再使用 NEXT_PUBLIC_）
 * 所有搜尋請求改走 /api/pexels/search 代理端點、key 不會暴露給瀏覽器
 *
 * 前往 https://www.pexels.com/api/ 申請（免費）
 */

export interface PexelsPhoto {
  id: number
  width: number
  height: number
  url: string
  photographer: string
  photographer_url: string
  photographer_id: number
  avg_color: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    small: string
    portrait: string
    landscape: string
    tiny: string
  }
  alt: string
}

interface PexelsSearchResult {
  total_results: number
  page: number
  per_page: number
  photos: PexelsPhoto[]
  next_page?: string
}

/**
 * 檢查 Pexels 是否可用（server-side：直接查 env；client-side：樂觀假設可用）
 * PexelsPicker 呼叫此函數時只在 client context，無法讀 server env，
 * 所以改為固定回 true，讓 picker render；若 API 未設定，搜尋時才報錯。
 */
export function isPexelsConfigured(): boolean {
  // server-side：直接查 server-only env var
  if (typeof window === 'undefined') {
    return Boolean(process.env.PEXELS_API_KEY)
  }
  // client-side：樂觀回 true（實際 key 由 /api/pexels/search 持有）
  return true
}

/**
 * 搜尋 Pexels 圖片（透過 /api/pexels/search 代理）
 * API key 留在 server 端，不暴露給 browser
 */
export async function searchPexelsPhotos(
  query: string,
  options?: {
    page?: number
    perPage?: number
    orientation?: 'landscape' | 'portrait' | 'square'
    size?: 'large' | 'medium' | 'small'
  }
): Promise<PexelsSearchResult> {
  const params = new URLSearchParams({
    query,
    page: String(options?.page ?? 1),
    per_page: String(options?.perPage ?? 20),
    ...(options?.orientation && { orientation: options.orientation }),
  })

  const response = await fetch(`/api/pexels/search?${params}`)

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('請先登入才能搜尋圖片')
    }
    if (response.status === 429) {
      throw new Error('Pexels API 請求次數過多，請稍後再試')
    }
    if (response.status === 503) {
      throw new Error('Pexels API 未設定，請聯絡系統管理員')
    }
    const body = await response.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Pexels 搜尋失敗: ${response.status}`)
  }

  return response.json()
}

/**
 * 取得旅遊相關的推薦搜尋關鍵字
 */
export const PEXELS_TRAVEL_KEYWORDS = {
  zh: [
    '旅行',
    '海灘',
    '山景',
    '都市',
    '建築',
    '美食',
    '咖啡廳',
    '夜景',
    '黃昏',
    '日出',
    '度假村',
    '機場',
    '寺廟',
    '古城',
    '街道',
    '熱帶',
    '雪景',
    '楓葉',
    '花海',
    '叢林',
  ],
  en: [
    'travel',
    'beach',
    'mountain',
    'city',
    'architecture',
    'food',
    'cafe',
    'night',
    'sunset',
    'sunrise',
    'resort',
    'airport',
    'temple',
    'ancient',
    'street',
    'tropical',
    'snow',
    'autumn',
    'flowers',
    'jungle',
  ],
}
