import {
  ParticipantCounts,
  SellingPrices,
  IdentityCosts,
  IdentityProfits,
  AccommodationSummaryItem,
  CostCategory,
} from '../_types'
import { calculateTierPricingCosts } from './calculateTierPricing'

/**
 * 全形轉半形數字
 */
export const normalizeNumber = (value: string): string => {
  return value.replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
}

/**
 * 計算利潤
 */
export const calculateProfit = (sellingPrice: number, cost: number): number => {
  return sellingPrice - cost
}

/**
 * 計算所有身份的利潤
 */
export const calculateIdentityProfits = (
  sellingPrices: SellingPrices,
  identityCosts: IdentityCosts
): IdentityProfits => {
  return {
    adult: calculateProfit(sellingPrices.adult, identityCosts.adult),
    child_with_bed: calculateProfit(sellingPrices.child_with_bed, identityCosts.child_with_bed),
    child_no_bed: calculateProfit(sellingPrices.child_no_bed, identityCosts.child_no_bed),
    single_room: calculateProfit(sellingPrices.single_room, identityCosts.single_room),
    infant: calculateProfit(sellingPrices.infant, identityCosts.infant),
  }
}

/**
 * 計算房型成本（目標房型住宿 + 其他所有費用）
 */
export const getRoomTypeCost = (
  roomName: string,
  type: 'adult' | 'child',
  accommodationSummary: AccommodationSummaryItem[],
  identityCosts: IdentityCosts
): number => {
  const room = accommodationSummary.find(r => r.name === roomName)
  if (!room) return 0

  // 目標房型的住宿費（所有天數加總，已經除過人數）
  const targetRoomCost = Math.ceil(room.total_cost)

  // 基礎成本（identityCosts 已包含：機票、交通、房型1住宿、餐飲、活動、團體分攤、領隊導遊）
  const baseCost = type === 'adult' ? identityCosts.adult : identityCosts.child_with_bed

  // 取得第一個房型的住宿費
  const firstRoom = accommodationSummary[0]
  const firstRoomCost = firstRoom ? Math.ceil(firstRoom.total_cost) : 0

  // 替換住宿費：基礎成本 - 房型1住宿 + 目標房型住宿
  return baseCost - firstRoomCost + targetRoomCost
}

/**
 * 計算房型利潤
 */
export const getRoomTypeProfit = (
  roomName: string,
  type: 'adult' | 'child',
  sellingPrices: SellingPrices,
  accommodationSummary: AccommodationSummaryItem[],
  identityCosts: IdentityCosts
): number => {
  const cost = getRoomTypeCost(roomName, type, accommodationSummary, identityCosts)
  const price = sellingPrices.room_types?.[roomName]?.[type] || 0
  return price - cost
}

/**
 * 計算新檻次表的人數分布（保持原始比例）
 */
export const calculateTierParticipantCounts = (
  targetCount: number,
  originalCounts: ParticipantCounts
): ParticipantCounts => {
  const totalOriginal =
    originalCounts.adult +
    originalCounts.child_with_bed +
    originalCounts.child_no_bed +
    originalCounts.single_room

  const ratio = totalOriginal > 0 ? targetCount / totalOriginal : 1

  return {
    adult: Math.round(originalCounts.adult * ratio),
    child_with_bed: Math.round(originalCounts.child_with_bed * ratio),
    child_no_bed: Math.round(originalCounts.child_no_bed * ratio),
    single_room: Math.round(originalCounts.single_room * ratio),
    infant: Math.round(originalCounts.infant * ratio),
  }
}

/**
 * 計算新檻次表的成本
 */
export const calculateTierCosts = (
  categories: CostCategory[],
  newCounts: ParticipantCounts,
  originalCounts: ParticipantCounts
): IdentityCosts => {
  return calculateTierPricingCosts(categories, newCounts, originalCounts)
}

/**
 * 生成唯一 ID
 */
export const generateUniqueId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
