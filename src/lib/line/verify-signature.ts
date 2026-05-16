/**
 * LINE Webhook 簽章驗證
 *
 * LINE 文件：https://developers.line.biz/en/reference/messaging-api/#signature-validation
 *
 * 規則：
 *   1. 取 X-Line-Signature header
 *   2. 用 channel_secret 對 raw request body 算 HMAC-SHA256、結果 base64
 *   3. 比對 header（用 timing-safe 比對、避免 timing attack）
 *
 * Multi-tenant：channel_secret 由 webhook router 反查 workspace 後傳入、
 * 不從 .env 讀（每 workspace 不同）。
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

export interface LineSignatureResult {
  valid: boolean
  reason?: string
}

/**
 * 驗證 LINE webhook 簽章
 *
 * @param rawBody - 原始 request body 字串（必須是 raw、不能是 parsed JSON）
 * @param signatureHeader - X-Line-Signature header 值
 * @param channelSecret - 該 workspace 的 LINE channel_secret
 */
export function verifyLineSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  channelSecret: string
): LineSignatureResult {
  if (!signatureHeader) {
    return { valid: false, reason: 'missing X-Line-Signature header' }
  }

  if (!channelSecret) {
    return { valid: false, reason: 'missing channel_secret' }
  }

  const expected = createHmac('sha256', channelSecret).update(rawBody).digest('base64')

  // base64 字串長度若不等、直接 false（避免 timingSafeEqual 拋例外）
  if (expected.length !== signatureHeader.length) {
    return { valid: false, reason: 'signature length mismatch' }
  }

  const expectedBuf = Buffer.from(expected)
  const actualBuf = Buffer.from(signatureHeader)

  if (!timingSafeEqual(expectedBuf, actualBuf)) {
    return { valid: false, reason: 'signature mismatch' }
  }

  return { valid: true }
}
