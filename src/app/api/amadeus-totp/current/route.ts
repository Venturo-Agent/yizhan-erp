import { NextResponse } from 'next/server'
import { getServerAuth } from '@/lib/auth/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { decryptSecret } from '@/lib/crypto/totp-encryption'
import { generateTotp } from '@/lib/crypto/totp'
import { logger } from '@/lib/utils/logger'

interface EmployeeTotpRow {
  amadeus_totp_secret: string | null
  amadeus_totp_account_name: string | null
}

/**
 * auth-only 合理：員工自己看當前 TOTP、登入即可
 */
export async function GET() {
  try {
    const auth = await getServerAuth()
    if (!auth.success) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('employees')
      .select('amadeus_totp_secret, amadeus_totp_account_name')
      .eq('id', auth.data.employeeId)
      .single<EmployeeTotpRow>()

    if (error) {
      logger.error('Amadeus TOTP current DB error:', error)
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    if (!data?.amadeus_totp_secret) {
      return NextResponse.json({ configured: false })
    }

    const secret = decryptSecret(data.amadeus_totp_secret)
    const { code, remaining } = generateTotp(secret)

    return NextResponse.json({
      configured: true,
      code,
      remaining,
      accountName: data.amadeus_totp_account_name,
    })
  } catch (err) {
    logger.error('Amadeus TOTP current error:', err)
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }
}
