/**
 * customer-match.service.ts — 顧客比對共用函式（SSOT）
 *
 * 給「單筆驗證（useMemberEditDialog）」與「批次比對（useBatchCustomerMatch）」共用，
 * 避免兩邊比對規則不一致（福岡團 320 張垃圾卡的根因之一就是比對鍵散刻、各做各的）。
 *
 * 比對規則（2026-05-26 設計提案第三節定案）：
 * - 身分證號 national_id = 同一人的「錨點」（一輩子不變、一比中就是同一人）→ matched
 * - 護照號 passport_number = 會變動的資料、不當身分錨點（比中可參考、主要拿來更新）
 * - 名字 = 弱線索：身分證沒比中但名字撞到 → ambiguous（撞名、需人工確認）
 * - 外國人/沒身分證 → 用「護照號 + 名字」、撞名一樣回報需確認
 * - 都沒比中 → none（查無、將建新）
 */

import type { Customer } from '@/types/customer.types'

/** 比對輸入：團員身上可拿來比對的三個鍵 */
export interface CustomerMatchInput {
  chinese_name?: string | null
  national_id?: string | null
  passport_number?: string | null
}

/** 比對結果分類 */
export type CustomerMatchKind = 'matched' | 'ambiguous' | 'none'

/** 撞名/比中的原因（決定 UI 怎麼提示、跟拿哪個鍵比中的） */
export type CustomerMatchReason =
  | 'national_id' // 身分證號比中 → 可靠對中（同一人）
  | 'passport_with_name' // 沒身分證、用護照號 + 名字比中 → 可靠對中（外國人情境）
  | 'name_clash' // 身分證沒比中、但名字撞到 → 需人工確認
  | 'none' // 查無

export interface CustomerMatchResult {
  kind: CustomerMatchKind
  reason: CustomerMatchReason
  /** matched 時：對中的顧客 id */
  customerId?: string
  /** matched 時：對中的顧客本尊（拿來更新/帶資料用） */
  matchedCustomer?: Customer
  /** ambiguous 時：候選清單（撞名的全部既有顧客） */
  candidates?: Customer[]
}

/** 去掉名字尾巴的括號註記（譬如「王小明(已收訂)」→「王小明」）後 trim */
function cleanName(name?: string | null): string {
  return (name || '')
    .replace(/\([^)]+\)$/, '')
    .replace(/⚠️/g, '')
    .trim()
}

function normalizeId(value?: string | null): string {
  return (value || '').toUpperCase().trim()
}

function normalizePassport(value?: string | null): string {
  return (value || '').toUpperCase().trim()
}

/**
 * 比對單一團員 vs 既有顧客清單，回傳分類結果。
 *
 * @param input 團員身上的比對鍵
 * @param customers 既有顧客清單（caller 自己 query 好傳進來、本函式不碰 DB）
 */
export function matchCustomer(
  input: CustomerMatchInput,
  customers: Customer[]
): CustomerMatchResult {
  const idNumber = normalizeId(input.national_id)
  const passportNumber = normalizePassport(input.passport_number)
  const name = cleanName(input.chinese_name)

  // 1. 身分證號 = 同一人錨點：一比中就是同一人 → matched
  if (idNumber) {
    const byId = customers.find(c => normalizeId(c.national_id) === idNumber)
    if (byId) {
      return {
        kind: 'matched',
        reason: 'national_id',
        customerId: byId.id,
        matchedCustomer: byId,
      }
    }
  }

  // 2. 沒身分證（或身分證沒比中）：外國人/沒身分證情境 → 用「護照號 + 名字」比對
  //    護照號會換，所以不單獨用護照號當錨點，要再加名字才算可靠對中。
  if (!idNumber && passportNumber) {
    const byPassportAndName = customers.filter(
      c =>
        normalizePassport(c.passport_number) === passportNumber &&
        (!name || cleanName(c.name) === name)
    )
    if (byPassportAndName.length === 1) {
      return {
        kind: 'matched',
        reason: 'passport_with_name',
        customerId: byPassportAndName[0].id,
        matchedCustomer: byPassportAndName[0],
      }
    }
    if (byPassportAndName.length > 1) {
      // 護照號 + 名字撞到多個 → 需人工確認
      return { kind: 'ambiguous', reason: 'name_clash', candidates: byPassportAndName }
    }
  }

  // 3. 名字 = 弱線索：身分證沒比中、但名字撞到 → 需人工確認（撞名）
  if (name) {
    const byName = customers.filter(c => cleanName(c.name) === name)
    if (byName.length > 0) {
      return { kind: 'ambiguous', reason: 'name_clash', candidates: byName }
    }
  }

  // 4. 都沒比中 → 查無、將建新
  return { kind: 'none', reason: 'none' }
}
