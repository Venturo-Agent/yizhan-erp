/**
 * 永豐銀行 API 加解密 lib（搬自 ~/Desktop/venturo-line-payment-bot/src/utils/sinopac.js）
 *
 * 2026-05-23 William 拍板：把 line-payment-bot 程式碼合併進 ERP、不再兩個 repo 並存。
 *
 * 對應永豐規格書 §5.5 / §5.6：
 *   - HashID：四組 Hash 值組合 → SHA-256 → 前 32 碼
 *   - Sign：訊息內文（排序後 JSON）+ Nonce + HashID → SHA-256 → 大寫 hex
 *   - 加密：AES-256-CBC、key = HashID（32 字元）、IV = Nonce 前 16 碼
 *
 * 用法（Phase 2 接真實 EPOS 才需要）：
 *   const hashID = generateHashID(h1, h2, h3, h4)
 *   const nonce = await fetchNonce()  // 60 秒內有效、permitted call
 *   const encrypted = encryptMessage(payload, hashID, nonce)
 *   const sign = generateSign(JSON.stringify(payload), nonce, hashID)
 *   POST { encrypted, sign, nonce } → 永豐 API
 *
 * Phase 1 mock 階段不會 call 這個 module、保留給 Phase 2 用。
 */

import crypto from 'node:crypto'

/**
 * 永豐 HashID 規格：四組 Hash 組合後 SHA-256、取前 32 碼
 * （32 字元正好等於 AES-256 key 長度）
 */
export function generateHashID(hash1: string, hash2: string, hash3: string, hash4: string): string {
  const combined = hash1 + hash2 + hash3 + hash4
  return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 32)
}

/**
 * 永豐 Sign 規格：排序後 JSON + Nonce + HashID → SHA-256 → 大寫 hex
 *
 * @param messageContent 原始 JSON 字串（會 parse 後排序）
 * @param nonce 永豐 API 取得的一次性 Nonce
 * @param hashID generateHashID() 產出
 */
export function generateSign(messageContent: string, nonce: string, hashID: string): string {
  const sortedMessage = sortObjectKeys(JSON.parse(messageContent) as unknown)
  const data = JSON.stringify(sortedMessage) + nonce + hashID
  return crypto.createHash('sha256').update(data).digest('hex').toUpperCase()
}

/**
 * 永豐加密規格：AES-256-CBC、key = HashID（32 字元 utf-8）、IV = Nonce 前 16 碼
 *
 * @param messageObj 要加密的 object（會 stringify + 排序）
 * @param hashID 32 字元 hex
 * @param nonce 至少 16 字元
 * @returns hex 大寫加密字串
 */
export function encryptMessage(messageObj: unknown, hashID: string, nonce: string): string {
  if (hashID.length !== 32) {
    throw new Error(`encryptMessage: hashID 必須是 32 字元（目前 ${hashID.length}）`)
  }
  if (nonce.length < 16) {
    throw new Error(`encryptMessage: nonce 至少 16 字元（目前 ${nonce.length}）`)
  }

  const iv = nonce.substring(0, 16)
  const messageStr = JSON.stringify(sortObjectKeys(messageObj))

  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(hashID, 'utf8'),
    Buffer.from(iv, 'utf8')
  )

  let encrypted = cipher.update(messageStr, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted.toUpperCase()
}

/**
 * 永豐解密規格：對應 encryptMessage 反向
 *
 * @param encryptedHex 大寫 hex
 * @param hashID 32 字元
 * @param nonce 至少 16 字元
 * @returns 解密後 JSON object
 */
export function decryptMessage<T = unknown>(
  encryptedHex: string,
  hashID: string,
  nonce: string
): T {
  if (hashID.length !== 32) {
    throw new Error(`decryptMessage: hashID 必須是 32 字元（目前 ${hashID.length}）`)
  }
  if (nonce.length < 16) {
    throw new Error(`decryptMessage: nonce 至少 16 字元（目前 ${nonce.length}）`)
  }

  const iv = nonce.substring(0, 16)
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(hashID, 'utf8'),
    Buffer.from(iv, 'utf8')
  )

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return JSON.parse(decrypted) as T
}

/**
 * 永豐 Sign / 加密都要求「物件 key 按字母排序」、確保兩端產出 hash 一致
 * 遞迴排序、支援 nested object / array
 */
export function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(sortObjectKeys)
  if (typeof obj !== 'object') return obj

  const sorted: Record<string, unknown> = {}
  const keys = Object.keys(obj as Record<string, unknown>).sort()
  for (const k of keys) {
    sorted[k] = sortObjectKeys((obj as Record<string, unknown>)[k])
  }
  return sorted
}
