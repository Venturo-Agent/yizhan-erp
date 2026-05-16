/**
 * CIS 拜訪錄音上傳 helper
 *
 * Path 規範：cis-audio/{workspace_id}/{client_id}/{visit_id_or_temp}/{filename}
 */

import { supabase } from '@/lib/supabase/client'

export interface UploadAudioResult {
  ok: true
  path: string
  publicUrl: string
}

export interface UploadAudioError {
  ok: false
  error: string
}

export async function uploadVisitAudio(params: {
  workspaceId: string
  clientId: string
  visitId?: string | null
  file: File
}): Promise<UploadAudioResult | UploadAudioError> {
  const { workspaceId, clientId, visitId, file } = params

  if (!workspaceId || !clientId) {
    return { ok: false, error: '缺少 workspace 或 client context' }
  }

  if (file.size > 50 * 1024 * 1024) {
    return { ok: false, error: '檔案超過 50MB 上限' }
  }

  const ts = Date.now()
  const safeName = file.name.replace(/[^\w.-]/g, '_')
  const folder = visitId || `temp-${ts}`
  const path = `${workspaceId}/${clientId}/${folder}/${ts}_${safeName}`

  const { error } = await supabase.storage.from('cis-audio').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'audio/mpeg',
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  // private bucket、用 signed URL（1 年）
  const { data: signed, error: signedError } = await supabase.storage
    .from('cis-audio')
    .createSignedUrl(path, 60 * 60 * 24 * 365)

  if (signedError || !signed) {
    return { ok: false, error: signedError?.message || '無法產生 signed URL' }
  }

  return { ok: true, path, publicUrl: signed.signedUrl }
}

export async function deleteVisitAudio(path: string): Promise<boolean> {
  const { error } = await supabase.storage.from('cis-audio').remove([path])
  return !error
}
