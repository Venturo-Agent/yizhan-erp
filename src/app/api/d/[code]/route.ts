import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/d/[code]
 *
 * 公開 API：短網址下載團員名冊（無需登入）
 * 透過團號取得最新的團員名冊並 redirect 到簽名 URL
 *
 * ⚠️ Security: Uses service_role client (bypasses RLS) because this is a public endpoint.
 * Tour codes are semi-predictable (e.g. CNX250128A). Risk is mitigated by:
 * - Only exposing the latest member roster file (not arbitrary data)
 * - Short-lived signed URLs (15 min expiry)
 * - Rate limit: 10 req/min per IP（防列舉爆破）
 */
/**
 * 故意不守 requireCapability：公開 deep link、用 code 驗證
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const limited = await checkRateLimit(request, 'd', 10, 60_000)
    if (limited) return limited

    const supabase = getSupabaseAdminClient()
    const { code } = await params

    // 1. 先查團號對應的 tour UUID
    // ⚠️ 公開 endpoint、設計上不篩 workspace_id（無 auth context）
    // tour code 全域可猜（已在檔案頂註解標註風險）
    const { data: tour } = await supabase.from('tours').select('id').eq('code', code).single()

    if (!tour) {
      return NextResponse.json({ error: 'Tour not found', code }, { status: 404 })
    }

    // 2. 查詢 tour_documents 表（用 UUID）
    // ⚠️ tour_id 是 UUID（不可猜）、間接受保護；公開短網址設計
    const { data, error } = await supabase
      .from('tour_documents')
      .select('file_path')
      .eq('tour_id', tour.id)
      .like('file_name', `${code}_members%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'File not found', tourId: tour.id }, { status: 404 })
    }

    // 生成 24hr signed URL
    const { data: signedData } = await supabase.storage
      .from('documents')
      .createSignedUrl(data.file_path, 900) // 15 min (short expiry to limit exposure)

    if (!signedData?.signedUrl) {
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
    }

    // 302 redirect to signed URL
    return NextResponse.redirect(signedData.signedUrl)
  } catch (error) {
    logger.error('API Error', { path: new URL(request.url).pathname, error })
    return NextResponse.json({ success: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}
