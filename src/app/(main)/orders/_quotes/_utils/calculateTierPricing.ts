import { CostCategory, ParticipantCounts, IdentityCosts, CostItem } from '../_types'

/**
 * 計算檻次表的各身份成本
 *
 * @param categories - 原始的費用分類資料
 * @param newParticipantCounts - 新的人數分布
 * @param originalParticipantCounts - 原始的人數分布（用於還原團體費用）
 * @returns 重新計算後的各身份成本
 */
export function calculateTierPricingCosts(
  categories: CostCategory[],
  newParticipantCounts: ParticipantCounts,
  originalParticipantCounts: ParticipantCounts
): IdentityCosts {
  const costs: IdentityCosts = {
    adult: 0,
    child_with_bed: 0,
    child_no_bed: 0,
    single_room: 0,
    infant: 0,
  }

  // 計算新的總人數（不含嬰兒）
  const newTotalParticipants =
    newParticipantCounts.adult +
    newParticipantCounts.child_with_bed +
    newParticipantCounts.child_no_bed +
    newParticipantCounts.single_room

  // 計算原始總人數（用於還原團體費用）
  const originalTotalParticipants =
    originalParticipantCounts.adult +
    originalParticipantCounts.child_with_bed +
    originalParticipantCounts.child_no_bed +
    originalParticipantCounts.single_room

  // 計算住宿總成本
  const accommodationCategory = categories.find(cat => cat.id === 'accommodation')
  if (accommodationCategory) {
    const accommodationItems = accommodationCategory.items.filter(item => item.day !== undefined)
    const groupedByDay: Record<number, CostItem[]> = {}

    // 按天分組
    accommodationItems.forEach(item => {
      const day = item.day!
      if (!groupedByDay[day]) groupedByDay[day] = []
      groupedByDay[day].push(item)
    })

    // 只取每天的第一個房型
    Object.keys(groupedByDay).forEach(dayStr => {
      const dayItems = groupedByDay[Number(dayStr)]
      if (dayItems.length > 0) {
        const firstRoomType = dayItems[0]
        const roomTotal = firstRoomType.total || 0

        // 成人和小孩 = 房型1小計
        costs.adult += roomTotal
        costs.child_with_bed += roomTotal

        // 單人房 = 房型1單價（全額）
        const roomPrice = firstRoomType.unit_price || 0
        costs.single_room += roomPrice
      }
    })
  }

  // 處理其他類別
  categories.forEach(category => {
    if (category.id === 'accommodation') return // 已處理

    category.items.forEach(item => {
      if (category.id === 'transport') {
        // 交通類別 — 邏輯需跟主報價單 useQuoteCalculations 一致
        if (item.name === '成人') {
          costs.adult += item.adult_price || 0
          costs.single_room += item.adult_price || 0
        } else if (item.name === '兒童') {
          costs.child_with_bed += item.child_price || 0
          costs.child_no_bed += item.child_price || 0
        } else if (item.name === '嬰兒') {
          costs.infant += item.infant_price || 0
        } else {
          // 其他交通費用（如機票、遊覽車）— 完整處理 adult/child/infant 三軌價 + fallback
          // 成人價格
          if (item.adult_price != null && item.adult_price > 0) {
            costs.adult += item.adult_price
            costs.single_room += item.adult_price
          } else {
            const itemCost = item.unit_price || 0
            costs.adult += itemCost
            costs.single_room += itemCost
          }
          // 兒童價格
          if (item.child_price != null && item.child_price > 0) {
            costs.child_with_bed += item.child_price
            costs.child_no_bed += item.child_price
          } else if (item.unit_price && item.unit_price > 0) {
            // 沒填兒童價、有統一價（如遊覽車）→ 佔床小孩跟成人同價、不佔床不算
            costs.child_with_bed += item.unit_price
            // 不佔床不含一般交通
          }
          // 嬰兒價格（只有填時才加）
          if (item.infant_price != null && item.infant_price > 0) {
            costs.infant += item.infant_price
          }
        }
      } else if (
        category.id === 'meals' ||
        category.id === 'activities' ||
        category.id === 'others'
      ) {
        // 餐飲、活動、其他 - 不佔床也要計算（除了住宿，其他費用都一樣）
        const itemCost = item.unit_price || 0
        costs.adult += itemCost
        costs.child_with_bed += itemCost
        costs.child_no_bed += itemCost
        costs.single_room += itemCost
      } else if (category.id === 'group-transport') {
        // 團體分攤 - 用新的總人數重新計算分攤費用
        const originalCostPerPerson = item.total || 0
        const totalCost = originalCostPerPerson * originalTotalParticipants
        const newCostPerPerson = newTotalParticipants > 0 ? totalCost / newTotalParticipants : 0

        costs.adult += newCostPerPerson
        costs.child_with_bed += newCostPerPerson
        costs.child_no_bed += newCostPerPerson
        costs.single_room += newCostPerPerson
      } else if (category.id === 'guide') {
        if (item.is_group_cost) {
          // 出差費（團體分攤）- 用新的總人數重新計算
          const originalCostPerPerson = item.total || 0
          const totalCost = originalCostPerPerson * originalTotalParticipants
          const newCostPerPerson = newTotalParticipants > 0 ? totalCost / newTotalParticipants : 0

          costs.adult += newCostPerPerson
          costs.child_with_bed += newCostPerPerson
          costs.child_no_bed += newCostPerPerson
          costs.single_room += newCostPerPerson
        } else {
          // 小費（個人費用）- 不隨人數變動，固定每人金額
          const itemCost = item.unit_price || 0
          costs.adult += itemCost
          costs.child_with_bed += itemCost
          costs.child_no_bed += itemCost
          costs.single_room += itemCost
        }
      }
    })
  })

  return costs
}
