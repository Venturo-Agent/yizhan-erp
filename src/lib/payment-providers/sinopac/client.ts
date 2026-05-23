/**
 * 永豐豐收款（QPay）WebAPI 通用呼叫流程
 *
 * 對應官方 SampleCode QPayToolkit.php 的 APIService()：
 *   1. 取 Nonce（POST {base}/Nonce、body {ShopNo}）
 *   2. HashID = generateHashID(hash)
 *   3. IV = getIV(nonce)
 *   4. Sign = generateSign(payload, nonce, hashID)
 *   5. Message = encryptMessage(payload, hashID, iv)
 *   6. POST {base}/Order、body {Version, ShopNo, APIService, Sign, Nonce, Message}
 *   7. 回應用 ResNonce 算 ResIV、decryptMessage(Response.Message, hashID, resIV)
 *
 * X-Key（API 授權碼）放 X-KeyID header、Nonce 跟 Order 兩個呼叫都要帶。
 *
 * 加解密細節全在 crypto.ts（已照 SampleCode 實作、6 測試過）、本檔只負責「編排 + 連線」。
 */

import {
  generateHashID,
  getIV,
  generateSign,
  encryptMessage,
  decryptMessage,
} from './crypto'
import type { SinopacConfig } from './config'

/** QPay request body 固定版本號（見 SampleCode API class $Version） */
const API_VERSION = '1.0.0'

interface NonceResponse {
  Nonce?: string
}

interface OrderApiResponse {
  Version?: string
  ShopNo?: string
  APIService?: string
  Sign?: string
  Nonce?: string
  /** 加密後的回應內文（大寫 hex） */
  Message?: string
  /** 連線層失敗時永豐可能直接帶錯誤碼（無 Message） */
  Status?: string
  Description?: string
}

/** 共用：POST JSON + 帶 X-KeyID header */
async function postJson<T>(url: string, body: unknown, xKey: string): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-KeyID': xKey,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`永豐 API 連線失敗（HTTP ${res.status}）：${url}`)
  }
  return (await res.json()) as T
}

/** 取 Nonce（每次呼叫都要重新取、一次性） */
async function getNonce(config: SinopacConfig): Promise<string> {
  const data = await postJson<NonceResponse>(
    config.baseUrl + 'Nonce',
    { ShopNo: config.shopNo },
    config.xKey,
  )
  if (!data?.Nonce) {
    throw new Error('永豐取 Nonce 失敗（回應無 Nonce、檢查 ShopNo / X-Key 是否正確）')
  }
  return data.Nonce
}

/**
 * 呼叫一個 QPay APIService（OrderCreate / OrderUnCapturedQuery / OrderMaintain ...）。
 *
 * @param config     getSinopacConfig() 產出
 * @param apiService 服務名（如 'OrderCreate'）
 * @param payload    該服務的參數物件（第一層 scalar 進 Sign、整包加密進 Message）
 * @returns          解密後的服務回應 JSON
 */
export async function callApiService<TRes = Record<string, unknown>>(
  config: SinopacConfig,
  apiService: string,
  payload: Record<string, unknown>,
): Promise<TRes> {
  const nonce = await getNonce(config)
  const hashID = generateHashID(config.hash)
  const iv = getIV(nonce)
  const sign = generateSign(payload, nonce, hashID)
  const message = encryptMessage(payload, hashID, iv)

  const res = await postJson<OrderApiResponse>(
    config.baseUrl + 'Order',
    {
      Version: API_VERSION,
      ShopNo: config.shopNo,
      APIService: apiService,
      Sign: sign,
      Nonce: nonce,
      Message: message,
    },
    config.xKey,
  )

  if (!res?.Message || !res?.Nonce) {
    // 連線層被拒（Sign 錯 / X-Key 過期 / ShopNo 不符）→ 永豐回錯誤碼但無加密內文
    const reason = res?.Description || res?.Status || '回應無 Message/Nonce'
    throw new Error(`永豐 ${apiService} 呼叫被拒：${reason}`)
  }

  // 注意：解密用「回應的 ResNonce」算 IV、不是 request 的 nonce
  const resIv = getIV(res.Nonce)
  return decryptMessage<TRes>(res.Message, hashID, resIv)
}
