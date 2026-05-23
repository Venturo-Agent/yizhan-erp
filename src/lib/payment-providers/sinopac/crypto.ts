/**
 * 永豐銀行「豐收款」QPay Web API 加解密 lib
 *
 * ⚠️ 2026-05-23 重寫：照永豐官方 SampleCode（QPay.SampleCode-php/QPayToolkit.php）。
 *   舊版（line-payment-bot 搬來）演算法跟官方對不上、三處錯誤、已驗證不可用：
 *     - HashID：舊版「四段字串接 SHA256」→ 正：四組金鑰兩兩 XOR
 *     - IV：舊版「nonce 前 16 碼」→ 正：SHA256(nonce) 後 16 碼
 *     - Sign：舊版 JSON → 正：第一層 scalar 欄位 key=value& 排序組合
 *
 * QPay API 流程（見 client.ts）：
 *   1. 取 Nonce（POST {ShopNo} → /Nonce）
 *   2. HashID = generateHashID(shopHash)         （AES-256 key、32 字元）
 *   3. IV = getIV(nonce)                          （16 字元）
 *   4. Sign = generateSign(payload, nonce, hashID)
 *   5. Message = encryptMessage(payload, hashID, iv)
 *   6. POST {ShopNo, APIService, Sign, Nonce, Message, Version:'1.0.0'} → /Order
 *   7. 回應用 ResNonce 算 ResIV、decryptMessage(Response.Message, hashID, resIV)
 */

import crypto from 'node:crypto'

/** 商店雜湊值（永豐提供、各 workspace 各自一組；SampleCode 範例為假值） */
export interface ShopHash {
  A1: string
  A2: string
  B1: string
  B2: string
}

function sha256Upper(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex').toUpperCase()
}

/** 兩段等長 hex 字串逐 byte XOR、回大寫 hex（對應 SampleCode setXOR + hexBytesToString） */
function xorHex(hex1: string, hex2: string): string {
  const b1 = Buffer.from(hex1, 'hex')
  const b2 = Buffer.from(hex2, 'hex')
  const len = Math.min(b1.length, b2.length)
  const out = Buffer.alloc(len)
  for (let i = 0; i < len; i++) out[i] = b1[i] ^ b2[i]
  return out.toString('hex').toUpperCase()
}

/**
 * HashID = XOR(A1,A2) + XOR(B1,B2)、大寫 hex
 * 四組各 8 bytes(16 hex字元) → XOR 後各 16 hex字元 → 合 32 字元
 * 這 32 字元 string 直接當 AES-256 key（utf8 = 32 bytes）
 * （對應 SampleCode getHashID）
 */
export function generateHashID(hash: ShopHash): string {
  return xorHex(hash.A1, hash.A2) + xorHex(hash.B1, hash.B2)
}

/**
 * IV = SHA256(nonce) 大寫 hex 的「後 16 碼」（對應 SampleCode getIV）
 * 這 16 字元 string 直接當 AES IV（utf8 = 16 bytes）
 */
export function getIV(nonce: string): string {
  return sha256Upper(nonce).slice(-16)
}

/** 移除空值（對應 SampleCode array_filter：null/undefined/空字串/空集合不參與） */
function filterEmpty(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === '') continue
    if (Array.isArray(v) && v.length === 0) continue
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0) continue
    out[k] = v
  }
  return out
}

/**
 * Sign：第一層 scalar 欄位（排除 null/物件/陣列）按 key 升序組 `k=v&k=v`
 *   + nonce + hashID → SHA256 大寫（對應 SampleCode getSign）
 */
export function generateSign(
  data: Record<string, unknown>,
  nonce: string,
  hashID: string
): string {
  const keys = Object.keys(data)
    .filter((k) => {
      const v = data[k]
      if (v === null || v === undefined || v === '') return false
      if (typeof v === 'object') return false // 只取第一層 scalar（陣列/物件不進 Sign）
      return true
    })
    .sort()
  const content = keys.map((k) => `${k}=${String(data[k])}`).join('&') + nonce + hashID
  return sha256Upper(content)
}

/**
 * AES-256-CBC 加密（對應 SampleCode EncryptAesCBC）
 *   key = HashID（32 字元 utf8）、IV = getIV() 結果（16 字元 utf8）
 *   PKCS7 padding（Node 預設 = SampleCode 手動 PKCS7 等價）、輸出大寫 hex
 * @param messageObj 要加密的 payload（會先移除空值再 JSON 序列化）
 * @param hashID generateHashID() 產出（32 字元）
 * @param iv getIV() 產出（16 字元）
 */
export function encryptMessage(
  messageObj: Record<string, unknown>,
  hashID: string,
  iv: string
): string {
  if (hashID.length !== 32) {
    throw new Error(`encryptMessage: hashID 必須 32 字元（目前 ${hashID.length}）`)
  }
  if (iv.length !== 16) {
    throw new Error(`encryptMessage: iv 必須 16 字元（目前 ${iv.length}）`)
  }
  const json = JSON.stringify(filterEmpty(messageObj))
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(hashID, 'utf8'),
    Buffer.from(iv, 'utf8')
  )
  let enc = cipher.update(json, 'utf8', 'hex')
  enc += cipher.final('hex')
  return enc.toUpperCase()
}

/**
 * AES-256-CBC 解密（對應 SampleCode DecryptAesCBC）
 * @param encryptedHex 永豐回應的 Message（大寫 hex）
 * @param hashID 同加密用的 HashID
 * @param iv 用「回應的 ResNonce」算的 IV（getIV(resNonce)）— 注意不是 request 的 IV
 */
export function decryptMessage<T = unknown>(
  encryptedHex: string,
  hashID: string,
  iv: string
): T {
  if (hashID.length !== 32) {
    throw new Error(`decryptMessage: hashID 必須 32 字元（目前 ${hashID.length}）`)
  }
  if (iv.length !== 16) {
    throw new Error(`decryptMessage: iv 必須 16 字元（目前 ${iv.length}）`)
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(hashID, 'utf8'),
    Buffer.from(iv, 'utf8')
  )
  let dec = decipher.update(encryptedHex, 'hex', 'utf8')
  dec += decipher.final('utf8')
  return JSON.parse(dec) as T
}
