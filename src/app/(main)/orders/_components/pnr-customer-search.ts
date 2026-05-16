/**
 * PNR 旅客姓名 → 客戶資料庫搜尋
 * 只搜尋姓氏匹配的客戶，而不是載入全部（效能優化）
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { normalizeName, splitPassportName, calculateSimilarity } from './pnr-name-matcher'

export interface SuggestedCustomer {
  id: string
  name: string
  passport_name: string | null
  passport_number: string | null
  passport_expiry: string | null
  passport_image_url: string | null
  national_id: string | null
  birth_date: string | null
  gender: string | null
  score: number
}

export async function searchCustomersForPassengers(
  pnrNames: string[]
): Promise<Record<string, SuggestedCustomer[]>> {
  if (pnrNames.length === 0) return {}

  try {
    // 提取所有旅客的姓氏
    const surnames = [
      ...new Set(
        pnrNames
          .map(name => splitPassportName(name).surname)
          .filter(Boolean)
      ),
    ]

    if (surnames.length === 0) return {}

    // 只查詢姓氏匹配的客戶（使用 ilike 模糊查詢）
    const surnameConditions = surnames.map(s => `passport_name.ilike.${s}/%`).join(',')

    const { data: customers, error } = await supabase
      .from('customers')
      .select(
        'id, name, passport_name, passport_number, passport_expiry, passport_image_url, national_id, birth_date, gender'
      )
      .not('passport_name', 'is', null)
      .or(surnameConditions)
      .limit(200)

    if (error) throw error

    const suggestions: Record<string, SuggestedCustomer[]> = {}

    for (const pnrName of pnrNames) {
      const normalizedPnr = normalizeName(pnrName)
      const pnrParts = splitPassportName(pnrName)
      const matchedCustomers: SuggestedCustomer[] = []

      for (const customer of customers || []) {
        if (!customer.passport_name) continue

        const normalizedCustomer = normalizeName(customer.passport_name)
        const customerParts = splitPassportName(customer.passport_name)

        // 完全相符
        if (normalizedPnr === normalizedCustomer) {
          matchedCustomers.push({ ...customer, score: 100 })
          continue
        }

        // 姓氏必須完全相同才考慮
        if (pnrParts.surname !== customerParts.surname) continue

        // 姓氏相同，計算名字相似度
        const givenNameScore = calculateSimilarity(pnrParts.givenName, customerParts.givenName)
        if (givenNameScore >= 50) {
          matchedCustomers.push({ ...customer, score: givenNameScore })
        }
      }

      // 按分數排序，取前 5 個
      suggestions[pnrName] = matchedCustomers.sort((a, b) => b.score - a.score).slice(0, 5)
    }

    return suggestions
  } catch (error) {
    logger.error('搜尋客戶失敗:', error)
    return {}
  }
}
