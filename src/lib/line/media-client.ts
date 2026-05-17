/**
 * LINE Media Content API（圖片 / 影片 / 音訊下載）
 *
 * 設計：
 *   1. 從 LINE Content API 下載媒體 binary
 *   2. 上傳到 Supabase Storage `line-media` bucket
 *   3. 回傳 Storage URL
 *
 * 路徑格式：{workspaceId}/{lineUserId}/{messageId}.{ext}
 *
 * 注意：LINE Content API token 與 Messaging API 同一個 channel_access_token。
 * 圖片在 LINE server 端有效期有限（數小時），要在 webhook 處理時立即下載。
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

const LINE_CONTENT_API = 'https://api-data.line.me/v2/bot/message'

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/m4a': 'm4a',
  'audio/aac': 'aac',
}

const BUCKET = 'line-media'

export interface LineMediaUploadResult {
  url: string | null
  error?: string
}

/**
 * 下載 LINE 媒體 → 上傳到 line-media bucket → 回傳 URL。
 * 失敗不 throw，回 { url: null, error } 讓 webhook 繼續跑。
 */
export async function downloadAndStoreLineMedia(
  supabase: SupabaseClient,
  opts: {
    messageId: string
    channelAccessToken: string
    workspaceId: string
    lineUserId: string
  }
): Promise<LineMediaUploadResult> {
  const { messageId, channelAccessToken, workspaceId, lineUserId } = opts

  // 1. 從 LINE 下載
  let contentBuffer: ArrayBuffer
  let mimeType: string
  try {
    const res = await fetch(`${LINE_CONTENT_API}/${messageId}/content`, {
      headers: { Authorization: `Bearer ${channelAccessToken}` },
    })
    if (!res.ok) {
      return { url: null, error: `LINE Content API ${res.status}` }
    }
    mimeType = res.headers.get('content-type')?.split(';')[0]?.trim() ?? 'image/jpeg'
    contentBuffer = await res.arrayBuffer()
  } catch (err) {
    logger.error('[media-client] LINE Content API fetch failed', err, { messageId })
    return { url: null, error: 'fetch failed' }
  }

  // 2. 組 Storage 路徑
  const ext = MIME_TO_EXT[mimeType] ?? 'bin'
  const storagePath = `${workspaceId}/${lineUserId}/${messageId}.${ext}`

  // 3. 上傳到 Supabase Storage
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, contentBuffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (uploadErr) {
    // 23505-like: file already exists (duplicate webhook)
    if (!uploadErr.message.includes('already exists')) {
      logger.error('[media-client] Storage upload failed', uploadErr, { storagePath })
    }
    // 即使上傳失敗、嘗試取既有 URL
  }

  // 4. 取 signed URL（private bucket）
  const { data: signedData, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7) // 7 天有效

  if (signErr || !signedData?.signedUrl) {
    logger.error('[media-client] createSignedUrl failed', signErr, { storagePath })
    return { url: null, error: 'signed url failed' }
  }

  return { url: signedData.signedUrl }
}
