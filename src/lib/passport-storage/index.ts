/**
 * Passport Image Storage Helper
 *
 * 集中處理 passport-images bucket 的存取。
 * DB 只存 bare filename (e.g. "passport_XXX.jpg")，顯示時動態簽 15 分鐘 URL。
 * 也接受完整 URL（public / signed）— 會自動抽出 filename。
 */

import { supabase } from '@/lib/supabase/client'

const BUCKET = 'passport-images'
const DEFAULT_TTL_SECONDS = 15 * 60

/**
 * 從 DB 存的值抽出 storage path。
 * 接受格式：
 *   - bare filename: "passport_XXX.jpg"
 *   - public URL: ".../object/public/passport-images/passport_XXX.jpg"
 *   - signed URL: ".../object/sign/passport-images/passport_XXX.jpg?token=..."
 *   - base64 data URL: "data:image/jpeg;base64,..."（返回 null；不是 storage-based）
 */
function extractPassportPath(stored: string | null | undefined): string | null {
  if (!stored) return null
  if (stored.startsWith('data:')) return null
  const match = stored.match(/passport-images\/([^?]+)/)
  if (match) return decodeURIComponent(match[1])
  // 沒 match 到 URL 格式 → 假設已經是 bare path
  return stored
}

/**
 * 產生 15 分鐘短效簽章 URL 用於顯示護照照片。
 * base64 data URL 則直接回傳（legacy 資料、不經 storage）。
 */
export async function getPassportDisplayUrl(
  stored: string | null | undefined,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<string | null> {
  if (stored && stored.startsWith('data:')) return stored
  const path = extractPassportPath(stored)
  if (!path) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, ttlSeconds)
  if (error || !data) return null
  return data.signedUrl
}

/**
 * 上傳護照照片，返回 bare filename（存 DB 用）。
 * 不簽章、不回完整 URL — 顯示時呼叫 getPassportDisplayUrl 現場簽。
 */
async function _uploadPassportImage(file: File | Blob, filename?: string): Promise<string> {
  const actualFilename =
    filename ?? `passport_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(actualFilename, file, {
    upsert: false,
    contentType: (file as File).type || 'image/jpeg',
  })
  if (error) throw error
  return actualFilename
}

/**
 * 刪除 storage 中的護照照片。
 */
export async function deletePassportImage(stored: string | null | undefined): Promise<void> {
  const path = extractPassportPath(stored)
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}
