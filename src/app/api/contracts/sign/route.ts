import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateBody } from '@/lib/api/validation'
import { signContractSchema } from '@/lib/validations/api-schemas'
import { translateDbError } from '@/lib/db-error-translate'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/contracts/sign
 *
 * 公開 API：客戶簽署合約（無需登入）
 * 注意：使用 service client 因為客戶不會登入
 *
 * 🛡️ 安全機制：
 * 1. Rate limit：每 IP 5 次 / 60 秒（防 enumeration / 防連點重複送）
 * 2. UUID 122 bits entropy（brute-force 不可行）
 * 3. 已簽合約 immutable（status check）
 * 4. 30 天過期：合約建立超過 30 天無法線上簽（防舊連結被翻出來重簽）
 * 5. IP / user-agent 記錄供稽核
 */
const SIGNING_EXPIRY_DAYS = 30

/**
 * 故意不守 requireCapability：公開合約簽署端點、用 token 驗證（rate limit + 30 天過期）
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Rate limit：每 IP 5 次/60 秒
    const rateLimited = await checkRateLimit(request, 'contracts-sign', 5, 60_000)
    if (rateLimited) return rateLimited

    // 直接建立 service client，確保繞過 RLS
    const supabase = getSupabaseAdminClient()

    const validation = await validateBody(request, signContractSchema)
    if (!validation.success) return validation.error
    const { contractId, signature, signerPhone, signerAddress, signerIdNumber } = validation.data

    // 取得請求資訊（x-forwarded-for 可能多個 IP 串接、取第一個）
    const headersList = await headers()
    const xff = headersList.get('x-forwarded-for')
    const ip = (xff?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown').slice(
      0,
      100
    )
    const userAgent = (headersList.get('user-agent') || 'unknown').slice(0, 500)

    // 檢查合約是否存在且未簽署
    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('id, status, created_at')
      .eq('id', contractId)
      .single()

    if (fetchError || !contract) {
      return NextResponse.json(
        { error: '找不到合約', details: fetchError?.message },
        { status: 404 }
      )
    }

    if (contract.status === 'signed') {
      return NextResponse.json({ error: '此合約已簽署' }, { status: 400 })
    }

    // 30 天過期檢查（防舊連結被翻出來重簽）
    if (contract.created_at) {
      const createdAt = new Date(contract.created_at).getTime()
      const expiryThreshold = Date.now() - SIGNING_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      if (createdAt < expiryThreshold) {
        return NextResponse.json(
          { error: `此合約已過期（建立超過 ${SIGNING_EXPIRY_DAYS} 天）、請聯絡業務重發` },
          { status: 410 }
        )
      }
    }

    // 更新合約狀態 + 簽約人補填資訊
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        status: 'signed',
        signature_image: signature,
        ...(signerPhone && { signer_phone: signerPhone }),
        ...(signerAddress && { signer_address: signerAddress }),
        ...(signerIdNumber && { signer_id_number: signerIdNumber }),
        signature_ip: ip,
        signature_user_agent: userAgent,
        signed_at: new Date().toISOString(),
      })
      .eq('id', contractId)

    if (updateError) {
      logger.error('Contract sign update error:', updateError)
      const t = translateDbError(updateError)
      return NextResponse.json(
        { error: t.message, code: t.code, field: t.field },
        { status: t.httpStatus }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Contract sign error:', err)
    const t = translateDbError(err)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }
}
