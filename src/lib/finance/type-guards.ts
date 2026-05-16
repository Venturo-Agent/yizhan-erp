import type { Receipt } from '@/types/receipt.types'
import type { PaymentRequest } from '@/stores/types'

/** 團體收款 = 有 tour_id（直接綁團）或有 order_id（透過 order 綁團）*/
export function isTourReceipt(r: Receipt): boolean {
  return !!r.tour_id || !!r.order_id
}

/** 公司收款 = 沒綁 tour 也沒綁 order（公司其他進帳：退稅 / 利息 / 佣金）*/
export function isCompanyReceipt(r: Receipt): boolean {
  return !r.tour_id && !r.order_id
}

/** 薪資請款 = request_type 含「薪資 / salary」*/
export function isSalaryRequest(r: PaymentRequest): boolean {
  const t = (r.request_type || '').toLowerCase()
  return t.includes('薪資') || t.includes('salary')
}

/** 公司請款 = 沒綁團 + 不是薪資 */
export function isCompanyRequest(r: PaymentRequest): boolean {
  return !r.tour_id && !isSalaryRequest(r)
}

/** 團體請款 = 有綁團 + 不是薪資 */
export function isTourRequest(r: PaymentRequest): boolean {
  return !!r.tour_id && !isSalaryRequest(r)
}
