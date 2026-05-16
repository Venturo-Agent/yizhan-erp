/**
 * Meta Webhook X-Hub-Signature-256 驗證
 *
 * Meta 推送 webhook 時、header X-Hub-Signature-256: sha256=<hex>
 * 內容 = HMAC-SHA256(app_secret, raw_body)
 *
 * 用法：
 *   const valid = verifyMetaSignature(rawBody, signature, appSecret)
 *
 * app_secret 沒設（IG/FB setup 沒填）時、回 valid=true + reason='no_secret_skipped'
 * Production 強烈建議要求所有 workspace 填 app_secret。
 */

import { createHmac, timingSafeEqual } from 'crypto'

export interface SignatureVerifyResult {
  valid: boolean
  reason?: string
}

export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string | null | undefined
): SignatureVerifyResult {
  if (!appSecret || appSecret.length === 0) {
    // app_secret 沒設、跳過驗證（dev / 初期允許、production 必設）
    return { valid: true, reason: 'no_secret_skipped' }
  }
  if (!signatureHeader) {
    return { valid: false, reason: 'missing_signature_header' }
  }
  // header format: "sha256=<hex>"
  const prefix = 'sha256='
  if (!signatureHeader.startsWith(prefix)) {
    return { valid: false, reason: 'invalid_signature_format' }
  }
  const providedHex = signatureHeader.slice(prefix.length)
  const expectedHex = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')

  try {
    const a = Buffer.from(providedHex, 'hex')
    const b = Buffer.from(expectedHex, 'hex')
    if (a.length !== b.length) {
      return { valid: false, reason: 'length_mismatch' }
    }
    if (timingSafeEqual(a, b)) {
      return { valid: true }
    }
    return { valid: false, reason: 'signature_mismatch' }
  } catch {
    return { valid: false, reason: 'compare_error' }
  }
}
