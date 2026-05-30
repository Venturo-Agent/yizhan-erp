/**
 * POST /api/messaging/conversations/[id]/avatar
 *
 * 上傳群組對話自訂頭像。
 *   - 只接受 image/jpeg、image/png、image/webp、image/gif
 *   - 上傳到 line-media bucket：{workspaceId}/group-avatars/{id}.{ext}
 *   - 回傳 { url } 供 client 再 PATCH picture_url
 *
 * 守 ai_hub.write capability + workspace 隔離。
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, getCurrentWorkspaceIdServer } from '@/lib/supabase/api-client'
import { requireCapability } from '@/lib/auth/require-capability'
import { requireWorkspaceFeature } from '@/lib/auth/require-feature'
import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { ApiError } from '@/lib/api/response'
import { logger } from '@/lib/utils/logger'

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireCapability(CAPABILITIES.AI_HUB_WRITE)
    if (!guard.ok) return guard.response

    const feature = await requireWorkspaceFeature(guard.workspaceId, 'ai_hub', 'AI Hub')
    if (!feature.ok) return feature.response

    const workspaceId = await getCurrentWorkspaceIdServer()
    if (!workspaceId) return ApiError.unauthorized('未登入')

    const { id: conversationId } = await params
    if (!conversationId) {
      return NextResponse.json({ error: 'missing conversation id' }, { status: 400 })
    }

    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: '請用 multipart/form-data 上傳' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: '缺少 file 欄位' }, { status: 400 })
    }

    const mime = file.type
    const ext = ALLOWED_MIME[mime]
    if (!ext) {
      return NextResponse.json(
        { error: '不支援的圖片格式（JPEG / PNG / WebP / GIF）' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    if (bytes.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: '圖片最大 5 MB' }, { status: 400 })
    }

    const supabase = await createApiClient()
    const storagePath = `${workspaceId}/group-avatars/${conversationId}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('line-media')
      .upload(storagePath, bytes, { contentType: mime, upsert: true })

    if (uploadErr) {
      logger.error('avatar upload failed', { uploadErr, conversationId })
      return NextResponse.json({ error: '上傳失敗：' + uploadErr.message }, { status: 500 })
    }

    // 7-day signed URL — group avatars are cached by client; PATCH picture_url stores this URL
    // For longer retention, consider public bucket; 7d is acceptable for MVP
    const { data: signed, error: signErr } = await supabase.storage
      .from('line-media')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365) // 1 year

    if (signErr || !signed?.signedUrl) {
      logger.error('signed url failed', { signErr, conversationId })
      return NextResponse.json({ error: '無法生成圖片 URL' }, { status: 500 })
    }

    return NextResponse.json({ url: signed.signedUrl })
  } catch (err) {
    logger.error('POST avatar exception', { err })
    return ApiError.internal('系統錯誤')
  }
}
