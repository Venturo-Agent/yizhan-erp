/**
 * 永豐豐收款（QPay）信用卡線上刷卡
 *
 * 流程（導頁刷卡）：
 *   1. 我方 createCardOrder() → OrderCreate(PayType='C')、永豐回「刷卡頁 URL」
 *   2. 把客戶導去那個 URL（永豐 hosted 刷卡頁、客戶輸卡號）
 *   3. 刷完永豐導客戶回我方 ReturnURL（前台）+ POST 通知我方 BackendURL（後台 webhook）
 *   4. webhook 收到後用 queryOrder() 反查確認、再寫帳（B 階段做）
 *
 * 對應 SampleCode：PayType='C' + CardParam.AutoBilling='Y'（授權後自動請款）。
 * 加解密 / 連線全走 client.ts callApiService()、本檔只組各服務的 payload。
 */

import { callApiService } from './client'
import type { SinopacConfig } from './config'

// ─────────────────────────────────────────────────────────────
// OrderCreate（開刷卡單）
// ─────────────────────────────────────────────────────────────

export interface CreateCardOrderInput {
  /** 我方訂單編號（建議 'C' + 時間戳、唯一） */
  orderNo: string
  /** 金額（新台幣「元」、整數；本函式會自動 ×100 轉永豐要的「分」） */
  amount: number
  /** 收款名稱（顯示在刷卡頁 / 對帳） */
  productName: string
  /** 刷完導客戶回的前台網址 */
  returnUrl: string
  /** 永豐後台通知（webhook）網址、必須公開可達 */
  backendUrl: string
  /** 備註（選填） */
  memo?: string
  /** 自訂參數（選填、可塞我方 transaction id 方便 webhook 對單） */
  param1?: string
  param2?: string
  param3?: string
}

export interface CardOrderResult {
  /** 處理狀態（'S'=成功；其餘為錯誤碼） */
  Status?: string
  /** 狀態說明（如 'S0000 – 處理成功'） */
  Description?: string
  /** 我方訂單編號（回顯） */
  OrderNo?: string
  ShopNo?: string
  /** 永豐端交易序號（對帳 / 退款認這筆） */
  TSNo?: string
  /** 永豐回傳金額、單位為「分」（2026-05-23 實測：送 1100 顯示 NT$11、確認永豐用分） */
  Amount?: number
  PayType?: string
  /** 信用卡專屬參數 */
  CardParam?: {
    /** 刷卡頁網址（導客戶過去刷卡）— 2026-05-23 sandbox 實測確認在此欄位 */
    CardPayURL?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

/** 從 OrderCreate 回應取出刷卡頁網址（導客戶過去刷卡用） */
export function getCardPayUrl(result: CardOrderResult): string | undefined {
  return result.CardParam?.CardPayURL
}

/**
 * 開信用卡刷卡單、拿回永豐刷卡頁 URL。
 * 這是 A 階段煙霧測試呼叫的核心 —— 拿得回 URL 就代表加解密 + 憑證全通。
 */
export async function createCardOrder(
  config: SinopacConfig,
  input: CreateCardOrderInput,
): Promise<CardOrderResult> {
  const payload: Record<string, unknown> = {
    ShopNo: config.shopNo,
    OrderNo: input.orderNo,
    // 永豐 QPay 金額單位為「分」（最小貨幣單位）、元需 ×100
    Amount: String(Math.round(input.amount * 100)),
    CurrencyID: 'TWD',
    PrdtName: input.productName,
    PayType: 'C',
    ReturnURL: input.returnUrl,
    BackendURL: input.backendUrl,
    // AutoBilling=Y 授權後自動請款；ExpMinutes 刷卡連結有效時間、永豐上限 30 分鐘（手冊 8.1）
    CardParam: { AutoBilling: 'Y', ExpMinutes: 30 },
    Memo: input.memo,
    Param1: input.param1,
    Param2: input.param2,
    Param3: input.param3,
  }
  return callApiService<CardOrderResult>(config, 'OrderCreate', payload)
}

// ─────────────────────────────────────────────────────────────
// OrderQuery（交易查詢、webhook 反查用）
// ─────────────────────────────────────────────────────────────

export interface OrderQueryResult {
  Status?: string
  Description?: string
  [key: string]: unknown
}

/** 用我方訂單編號查交易狀態（webhook 收到通知後反查確認、防偽造） */
export async function queryOrder(
  config: SinopacConfig,
  orderNo: string,
): Promise<OrderQueryResult> {
  return callApiService<OrderQueryResult>(config, 'OrderQuery', {
    ShopNo: config.shopNo,
    OrderNo: orderNo,
    PayType: 'C',
  })
}

// ─────────────────────────────────────────────────────────────
// OrderMaintain（訂單維護：退款 / 取消）
// ─────────────────────────────────────────────────────────────

/**
 * 維護指令。'R'=退款（SampleCode 範例）。其餘指令（取消授權 / 請款）
 * 待對永豐文件確認後再開放、避免亂送。
 */
export type CardMaintainCommand = 'R'

export interface MaintainCardOrderInput {
  orderNo: string
  command: CardMaintainCommand
  /** 退款金額（部分退款用；全額退可省） */
  amount?: number
  /** 退款原因 */
  remark?: string
}

export interface MaintainResult {
  Status?: string
  Description?: string
  [key: string]: unknown
}

/** 訂單維護（目前僅開放退款 Command='R'） */
export async function maintainCardOrder(
  config: SinopacConfig,
  input: MaintainCardOrderInput,
): Promise<MaintainResult> {
  return callApiService<MaintainResult>(config, 'OrderMaintain', {
    ShopNo: config.shopNo,
    OrderNo: input.orderNo,
    Command: input.command,
    // 退款金額同樣是「分」、元 ×100
    Amount: input.amount !== undefined ? String(Math.round(input.amount * 100)) : undefined,
    Remark: input.remark,
  })
}

/** 退款便利方法（Command='R'） */
export async function refundCardOrder(
  config: SinopacConfig,
  orderNo: string,
  opts?: { amount?: number; remark?: string },
): Promise<MaintainResult> {
  return maintainCardOrder(config, {
    orderNo,
    command: 'R',
    amount: opts?.amount,
    remark: opts?.remark,
  })
}
