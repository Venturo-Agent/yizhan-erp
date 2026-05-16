/**
 * Workspace API integration 敏感欄位加解密
 *
 * 用途：加密 workspace_integrations.config 內的 api_key / api_secret / access_token 等
 * 漏 DB 也拿不到明文、master key 在 env (VENTURO_INTEGRATION_ENCRYPTION_KEY)
 *
 * 結構模仿 src/lib/crypto/totp-encryption.ts、但獨立 master key
 * 隔離性：TOTP secret 漏 ≠ integration API key 漏
 *
 * 加密格式：base64(iv + tag + ciphertext)、AES-256-GCM
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getKey(): Buffer {
  const keyB64 = process.env.VENTURO_INTEGRATION_ENCRYPTION_KEY
  if (!keyB64) {
    throw new Error('VENTURO_INTEGRATION_ENCRYPTION_KEY env 未設定')
  }
  const key = Buffer.from(keyB64, 'base64')
  if (key.length !== 32) {
    throw new Error(
      'VENTURO_INTEGRATION_ENCRYPTION_KEY 必須是 32 bytes base64（用 openssl rand -base64 32 產生）'
    )
  }
  return key
}

/**
 * 加密單一敏感值（api_key / api_secret / access_token 等）
 * @param plaintext 明文字串
 * @returns base64 envelope（含 iv + auth tag + ciphertext）
 */
export function encryptIntegrationSecret(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ciphertext]).toString('base64')
}

/**
 * 解密加密值
 * @param encoded base64 envelope
 * @returns 明文
 */
export function decryptIntegrationSecret(encoded: string): string {
  const key = getKey()
  const buf = Buffer.from(encoded, 'base64')
  if (buf.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('加密資料長度異常')
  }
  const iv = buf.subarray(0, IV_LENGTH)
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}

/**
 * 批次處理：config 內的指定欄位加密
 *
 * 使用情境：API route 收到使用者 PUT 的 plain config、儲存前過這個函數
 * 例：
 *   encryptConfigFields(
 *     { api_key: 'sk-xxx', endpoint: 'https://api.x.com' },
 *     ['api_key']
 *   )
 *   → { api_key: 'BASE64_ENVELOPE', endpoint: 'https://api.x.com' }
 *
 * 已加密過的值（已是 base64 envelope）不重複加密 — 判斷依據：欄位值為空時跳過
 *
 * @param config           plain config 物件
 * @param sensitiveFields  要加密的欄位名稱陣列
 */
export function encryptConfigFields<T extends Record<string, unknown>>(
  config: T,
  sensitiveFields: readonly (keyof T)[]
): T {
  const result = { ...config }
  for (const field of sensitiveFields) {
    const value = config[field]
    if (typeof value === 'string' && value.length > 0) {
      result[field] = encryptIntegrationSecret(value) as T[keyof T]
    }
  }
  return result
}

/**
 * 批次處理：config 內的指定欄位解密
 *
 * 使用情境：server side 從 DB 撈出 config、解密後傳給第三方 API client
 *
 * @param config           包含加密欄位的 config（從 DB 拿）
 * @param sensitiveFields  要解密的欄位名稱陣列
 */
export function decryptConfigFields<T extends Record<string, unknown>>(
  config: T,
  sensitiveFields: readonly (keyof T)[]
): T {
  const result = { ...config }
  for (const field of sensitiveFields) {
    const value = config[field]
    if (typeof value === 'string' && value.length > 0) {
      result[field] = decryptIntegrationSecret(value) as T[keyof T]
    }
  }
  return result
}

/**
 * 給設定 UI 用：把加密的 config 中敏感欄位「遮罩」成 '••••••••'
 * 這樣前端拿得到「有沒有設過」的資訊、但不會曝光明文
 */
export function maskConfigFields<T extends Record<string, unknown>>(
  config: T,
  sensitiveFields: readonly (keyof T)[]
): T {
  const result = { ...config }
  for (const field of sensitiveFields) {
    const value = config[field]
    if (typeof value === 'string' && value.length > 0) {
      result[field] = '••••••••' as T[keyof T]
    }
  }
  return result
}
