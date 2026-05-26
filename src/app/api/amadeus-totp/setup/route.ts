import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { encryptSecret } from '@/lib/crypto/totp-encryption'
import { logger } from '@/lib/utils/logger'
import { translateDbError } from '@/lib/db-error-translate'
import { createApiClient } from '@/lib/supabase/api-client'
import { recordApiAuditContext } from '@/lib/audit/audit-helper'

const BodySchema = z.object({
  secret: z
    .string()
    .min(16)
    .max(128)
    .transform(s => s.toUpperCase().replace(/\s+/g, '').replace(/=+$/, ''))
    .refine(s => /^[A-Z2-7]+$/.test(s), '種子必須是 base32 格式'),
  accountName: z.string().max(200).optional().nullable(),
})

/**
 * auth-only 合理：員工自己 setup TOTP、登入即可
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'secret 格式錯誤' },
        { status: 400 }
      )
    }

    const encrypted = encryptSecret(parsed.data.secret)

    const apiClient = await createApiClient()
    await recordApiAuditContext(apiClient, {
      actorId: auth.data.employeeId,
      reason: '設定 Amadeus TOTP',
    })

    const supabase = getSupabaseAdminClient()
    const { error } = await supabase
      .from('employees')
      .update({
        amadeus_totp_secret: encrypted,
        amadeus_totp_account_name: parsed.data.accountName || null,
      } as never)
      .eq('id', auth.data.employeeId)

    if (error) {
      logger.error('Amadeus TOTP setup DB error:', error)
      const t = translateDbError(error)
      return NextResponse.json(
        { error: t.message, code: t.code, field: t.field },
        { status: t.httpStatus }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Amadeus TOTP setup error:', err)
    const t = translateDbError(err)
    return NextResponse.json(
      { error: t.message, code: t.code, field: t.field },
      { status: t.httpStatus }
    )
  }
}
