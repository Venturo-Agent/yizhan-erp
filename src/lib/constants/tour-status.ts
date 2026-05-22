/**
 * Tour status SSOT — 哪些團算「正式運作中」、哪些是工作台暫存
 *
 * 業務語意：
 * - template / proposal = 工作台暫存（模板可複製、提案還在詢價）— 不可開收款 / 請款、不入帳
 * - upcoming / ongoing / returned / closed = 已開團有錢進出 — 入所有財務報表
 *
 * 既有同規則散落：usePaymentForm.ts:36 / useReceiptMutations.ts:107 — 改吃此 SSOT
 */

import type { TourStatus } from '@/types/tour'

/**
 * 正式團 status — 出現在所有財務報表 / 可開收款請款
 */
export const ACTIVE_TOUR_STATUSES: TourStatus[] = ['upcoming', 'ongoing', 'returned', 'closed']

/**
 * 工作台暫存 status — 不可開財務單據、不入報表
 */
export const DRAFT_TOUR_STATUSES: TourStatus[] = ['template', 'proposal']

export function isActiveTourStatus(status: string | null | undefined): boolean {
  return !!status && (ACTIVE_TOUR_STATUSES as readonly string[]).includes(status)
}

export function isDraftTourStatus(status: string | null | undefined): boolean {
  return !!status && (DRAFT_TOUR_STATUSES as readonly string[]).includes(status)
}
