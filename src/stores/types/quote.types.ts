// ============================
// 報價相關型別定義（Store 版本）
// 注意：Quote, QuickQuoteItem, QuoteCategory, QuoteItem
// 此處定義的是 Store 使用的精簡版（無 BaseEntity），
// 與 @/types/quote.types.ts 的 DAL 版本（含 BaseEntity）不同。
// 統一工作待後續進行。
// ============================

export type { Order } from '@/types/order.types'
export type { Customer } from '@/types/customer.types'
export type { Supplier } from '@/types/supplier.types'

// 以下從 @/types 統一來源 re-export
export type {  TierPricing } from '@/types/quote-store.types'

// Store 專用 Quote 型別（與 @/types/quote.types.ts 的 Quote extends BaseEntity 不同）
export type { Quote, QuickQuoteItem,  QuoteItem } from '@/types/quote-store.types'
