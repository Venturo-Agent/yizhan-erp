/**
 * PNR 解析器
 *
 * 支援多種航空公司/平台的 PNR 格式解析：
 * - Amadeus PNR 電報
 * - HTML 確認單
 * - 電子機票 (E-Ticket)
 * - 機票訂單明細（開票系統）
 * - Trip.com 行程確認單
 */

// 匯出所有類型
export * from './types'

// 匯出常量


// 匯出工具函數


// 匯出各格式解析器






// 導入解析器供智能入口使用
import { ParsedPNR, ParsedHTMLConfirmation } from './types'
import { parseAmadeusPNR } from './parsers/amadeus'
import { parseHTMLConfirmation } from './parsers/html-confirmation'
import { parseETicketConfirmation } from './parsers/e-ticket'
import { parseTicketOrderDetail } from './parsers/ticket-order-detail'
import { parseTripComConfirmation } from './parsers/trip-com'

/**
 * 智能檢測並解析 PNR（自動判斷格式）
 *
 * 支援五種格式：
 * 1. 機票訂單明細（開票系統匯出）⭐️ 機票成本以此為準
 *    - 金額（票面價）、附加費、稅金、小計
 *    - 這是「成本價格」，用於計算 flight_cost
 *    - 內嵌 Amadeus PNR
 *
 * 2. 電子機票（E-Ticket）- 金額為「售後價格」，不用於成本計算
 *    - 旅客姓名、機票號碼、訂位代號
 *    - 航班資訊
 *    - AIR FARE / TAX / TOTAL 是售價，非成本
 *
 * 3. Amadeus PNR 電報 - 無金額資訊
 *    - 旅客姓名、航班資訊
 *    - 出票期限
 *    - FA 行機票號碼
 *
 * 4. HTML 確認單（公司系統匯出）
 *    - 電腦代號、旅客姓名、航班資訊
 *    - 機票號碼、航空公司確認電話
 *
 * 5. Trip.com 行程確認單 - 中文格式
 *    - 訂單編號、旅客姓名、艙等、機票號碼、訂位代號
 *    - 出發/抵達時間、機場、航站
 *    - 航空公司、航班號
 *    - 經停資訊、行李限額
 */
export function parseFlightConfirmation(input: string): ParsedHTMLConfirmation | ParsedPNR {
  // 檢測是否為 HTML 格式
  if (input.includes('<html') || input.includes('<!DOCTYPE') || input.includes('電腦代號')) {
    return parseHTMLConfirmation(input)
  }

  // 檢測是否為「機票訂單明細」格式（開票系統匯出）
  // ⭐️ 機票金額以此格式為準（有 金額/附加費/稅金/小計）
  if (
    input.includes('機票訂單明細') ||
    input.includes('銷售摘要') ||
    (input.includes('金　額') && input.includes('小　計') && input.includes('訂位記錄'))
  ) {
    return parseTicketOrderDetail(input)
  }

  // 檢測是否為 Trip.com 格式
  // 特徵：包含「(姓)」「(名)」或「預訂參考編號」或「航班資訊」+中文日期格式
  if (
    (input.includes('(姓)') && input.includes('(名)')) ||
    input.includes('預訂參考編號') ||
    (input.includes('航班資訊') && /\d{4}年\d{1,2}月\d{1,2}日/.test(input))
  ) {
    return parseTripComConfirmation(input)
  }

  // 檢測是否為電子機票格式（包含 TICKET NUMBER 和 BOOKING REF）
  // 金額為選填，不一定提供
  if (
    input.includes('TICKET NUMBER') &&
    (input.includes('BOOKING REF') || input.includes('NAME:'))
  ) {
    return parseETicketConfirmation(input)
  }

  // 否則當作 Amadeus 電報處理
  return parseAmadeusPNR(input)
}

// 匯出增強型解析器


// 匯出驗證器和分析器




