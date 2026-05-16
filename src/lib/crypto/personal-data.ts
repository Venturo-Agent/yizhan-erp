/**
 * 個人敏感欄位加解密（Application-layer encryption）
 *
 * 適用欄位：
 *   - employees.bank_account_number（銀行帳號）
 *   - employees.id_number（身分證字號）
 *
 * 為什麼：
 *   這兩個欄位是《個人資料保護法》第六條「特種個人資料」範疇（財務帳號 / 政府識別碼）。
 *   DB 層若被攻擊（SQL injection / 內鬼匯出）、明文直接洩漏。
 *   Application-layer AES-256-GCM 加密後、DB 拿到的是 base64 密文、master key 只在 env。
 *
 * Key 管理：
 *   - env var: PERSONAL_DATA_ENCRYPTION_KEY
 *   - 格式：base64 encoded 32-byte random（用 `openssl rand -base64 32` 產生）
 *   - ⚠️ 必須 server-side only（不加 NEXT_PUBLIC_ 前綴）
 *   - ⚠️ 跟 VENTURO_INTEGRATION_ENCRYPTION_KEY 分開管理（洩漏隔離）
 *
 * 加密格式：base64( iv[12] + authTag[16] + ciphertext )
 *   同 src/lib/crypto/integration-encryption.ts 的 AES-256-GCM 格式、方便日後稽核。
 *
 * 安全考量：
 *   - 每次加密產生新的隨機 IV（防 nonce 重用）
 *   - GCM auth tag 防 tampering（改過的密文解密會 throw）
 *   - decryptPersonalField 解密失敗回傳 null（不拋、讓 caller 決定）
 *   - isEncrypted 可以判斷值是不是舊的明文（2-phase migration 過渡期用）
 *
 * 2-phase 遷移計畫（見 migration _pending_review/20260517200000_sec012_personal_data_encryption.sql）
 *   Phase 1（加欄位、寫密文）：新寫入走 encrypted_* 欄、舊明文欄留著
 *   Phase 2（確認全部寫到後、砍明文欄）：William review 後才 apply
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

/** 取 master key。只在 server-side call（API route / server action）、不 export。 */
function getKey(): Buffer {
  const keyB64 = process.env.PERSONAL_DATA_ENCRYPTION_KEY
  if (!keyB64) {
    throw new Error(
      'PERSONAL_DATA_ENCRYPTION_KEY env 未設定。' +
        '用 `openssl rand -base64 32` 產生、填入 .env.local（server-side only）。'
    )
  }
  const key = Buffer.from(keyB64, 'base64')
  if (key.length !== 32) {
    throw new Error(
      'PERSONAL_DATA_ENCRYPTION_KEY 必須是 32 bytes base64（用 openssl rand -base64 32 產生）'
    )
  }
  return key
}

/**
 * 加密個人敏感欄位。
 *
 * @param plaintext 明文字串（如身分證字號 / 銀行帳號）
 * @returns base64 envelope（含 iv + auth tag + ciphertext）
 *
 * @example
 *   const encrypted = encryptPersonalField('A123456789')
 *   // 存到 employees.id_number（或 encrypted_id_number）
 */
export function encryptPersonalField(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ciphertext]).toString('base64')
}

/**
 * 解密個人敏感欄位。
 *
 * @param ciphertext base64 envelope（來自 DB）
 * @returns 明文字串；若解密失敗（格式錯誤 / key 不對 / tampering）回傳 null
 *
 * @example
 *   const idNumber = decryptPersonalField(employee.id_number)
 *   // 可能 null（舊明文欄 / 解密失敗）— caller 自行處理
 */
export function decryptPersonalField(ciphertext: string): string | null {
  try {
    const key = getKey()
    const buf = Buffer.from(ciphertext, 'base64')
    if (buf.length < IV_LENGTH + TAG_LENGTH + 1) {
      // 太短：不是合法的加密 envelope（可能是舊的明文值）
      return null
    }
    const iv = buf.subarray(0, IV_LENGTH)
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const ct = buf.subarray(IV_LENGTH + TAG_LENGTH)
    const decipher = createDecipheriv(ALGO, key, iv)
    decipher.setAuthTag(tag)
    const plaintext = Buffer.concat([decipher.update(ct), decipher.final()])
    return plaintext.toString('utf8')
  } catch {
    // GCM auth tag 驗失敗（tampering）或其他解密錯誤 → 安靜回 null
    return null
  }
}

/**
 * 判斷一個字串是不是已經被本模組加密過的 envelope。
 *
 * 用途：2-phase migration 過渡期、DB 裡可能同時有明文舊值和密文新值。
 * 用這個 guard 避免對已加密的值重複加密。
 *
 * 判斷邏輯（保守判斷）：
 *   1. 值是合法 base64
 *   2. decode 後長度 >= IV_LENGTH + TAG_LENGTH + 1（最短 29 bytes → base64 至少 40 字元）
 *   3. 嘗試解密成功（最強的確認、但需要 key）
 *
 * ⚠️ 若 PERSONAL_DATA_ENCRYPTION_KEY 未設定、此函數回傳 false（不 throw）。
 *
 * @param value 要檢查的字串（來自 DB）
 * @returns true = 已加密；false = 明文（或 env key 未設）
 */
export function isEncrypted(value: string): boolean {
  if (!value || value.length < 40) return false
  try {
    const decoded = decryptPersonalField(value)
    return decoded !== null
  } catch {
    return false
  }
}
