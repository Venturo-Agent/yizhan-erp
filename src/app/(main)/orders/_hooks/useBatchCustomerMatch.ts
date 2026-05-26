'use client'
/**
 * useBatchCustomerMatch — 批次「比對顧客」邏輯
 *
 * 規格（2026-05-26 設計提案第四節）：
 *  - 挑「有護照或身分證、還沒連顧客」的團員
 *  - 跑共用比對函式 matchCustomer（身分證錨點 → 名字）
 *  - 列成審核清單：
 *      ✓ matched（身分證/護照+名字相符）→ 自動連結（預設勾）
 *      ⚠ ambiguous（撞名）→ 下拉選（連既有候選 / 建新 / 略過）
 *      ＋ none（查無）→ 將建新
 *  - [全部套用]：連結 / 更新本尊 / 建新，回寫 order_members.customer_id
 *
 * 寫入沿用既有 pattern（client supabase 直寫），不新增散刻 RPC。
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { createCustomer, invalidateCustomers } from '@/data'
import { updateCustomer } from '@/data/entities/customers'
import { updateMember } from '@/data/entities/members'
import type { Customer } from '@/types/customer.types'
import type { OrderMember } from '@/app/(main)/orders/_types/order-member.types'
import {
  matchCustomer,
  type CustomerMatchKind,
  type CustomerMatchReason,
} from '@/app/(main)/orders/_services/customer-match.service'

/** 使用者對單列撞名/查無的處置選擇 */
export type BatchResolution =
  | { type: 'link'; customerId: string } // 連到既有顧客（自動連結 or 選候選）
  | { type: 'create' } // 建新顧客
  | { type: 'skip' } // 略過、不處理

/** 審核清單一列 */
export interface BatchMatchRow {
  member: OrderMember
  kind: CustomerMatchKind
  reason: CustomerMatchReason
  /** matched 對中的顧客 */
  matched?: Customer
  /** ambiguous 的候選清單 */
  candidates: Customer[]
  /** 使用者目前選的處置（預設：matched→link、none→create、ambiguous→skip 等使用者決定） */
  resolution: BatchResolution
}

interface UseBatchCustomerMatchParams {
  members: OrderMember[]
  setMembers: React.Dispatch<React.SetStateAction<OrderMember[]>>
  /** 既有顧客清單（caller 從 useCustomersSlim 傳入） */
  customers: Customer[]
}

function defaultResolution(kind: CustomerMatchKind, matchedId?: string): BatchResolution {
  if (kind === 'matched' && matchedId) return { type: 'link', customerId: matchedId }
  if (kind === 'none') return { type: 'create' }
  return { type: 'skip' } // ambiguous 預設略過、等使用者決定
}

export function useBatchCustomerMatch({
  members,
  setMembers,
  customers,
}: UseBatchCustomerMatchParams) {
  const [isOpen, setIsOpen] = useState(false)
  const [rows, setRows] = useState<BatchMatchRow[]>([])
  const [isApplying, setIsApplying] = useState(false)

  // 開啟：挑出待比對團員、跑比對、建審核清單
  const openBatchMatch = useCallback(() => {
    const candidates = members.filter(m => {
      if (m.customer_id) return false // 已連顧客的略過
      const hasIdentity = Boolean(m.id_number?.trim() || m.passport_number?.trim())
      return hasIdentity
    })

    const builtRows: BatchMatchRow[] = candidates.map(member => {
      const result = matchCustomer(
        {
          chinese_name: member.chinese_name,
          national_id: member.id_number,
          passport_number: member.passport_number,
        },
        customers
      )
      return {
        member,
        kind: result.kind,
        reason: result.reason,
        matched: result.matchedCustomer,
        candidates: result.candidates ?? [],
        resolution: defaultResolution(result.kind, result.customerId),
      }
    })

    setRows(builtRows)
    setIsOpen(true)
  }, [members, customers])

  // 改某列的處置
  const setRowResolution = useCallback((memberId: string, resolution: BatchResolution) => {
    setRows(prev => prev.map(r => (r.member.id === memberId ? { ...r, resolution } : r)))
  }, [])

  const closeBatchMatch = useCallback(() => {
    setIsOpen(false)
    setRows([])
  }, [])

  // 連到既有顧客 + 用團員資料更新本尊（含換新護照）
  const linkAndUpdate = async (member: OrderMember, customerId: string) => {
    const { data: existing } = await supabase
      .from('customers')
      .select(
        'name, passport_name, birth_date, gender, national_id, passport_number, passport_expiry, passport_image_url'
      )
      .eq('id', customerId)
      .maybeSingle()
    const ex = existing as Record<string, unknown> | null

    const memberUpdate: { customer_id: string; passport_image_url?: string } = {
      customer_id: customerId,
    }
    const exPassportImg = (ex?.passport_image_url as string | null) || null
    if (exPassportImg && !member.passport_image_url) {
      memberUpdate.passport_image_url = exPassportImg
    }
    // 走 entity CRUD（非 client 直寫）、不觸發紅線 F
    await updateMember(member.id, memberUpdate)

    const customerUpdate: Record<string, unknown> = {
      name: member.chinese_name || (ex?.name as string) || null,
      passport_name: member.passport_name || (ex?.passport_name as string) || null,
      birth_date: member.birth_date || (ex?.birth_date as string) || null,
      gender: member.gender || (ex?.gender as string) || null,
      national_id: member.id_number || (ex?.national_id as string) || null,
      passport_number: member.passport_number || (ex?.passport_number as string) || null,
      passport_expiry: member.passport_expiry || (ex?.passport_expiry as string) || null,
      verification_status: 'verified',
    }
    // 走 entity CRUD（非 client 直寫）；name 等 NOT NULL 欄位實際有值、型別放寬為 Partial
    await updateCustomer(customerId, customerUpdate as Partial<Customer>)

    return customerId
  }

  // 建新顧客 + 連結
  const createAndLink = async (member: OrderMember): Promise<string | null> => {
    const newCustomer = await createCustomer({
      name: member.chinese_name || '',
      passport_name: member.passport_name || '',
      passport_number: member.passport_number?.trim() || null,
      passport_expiry: member.passport_expiry || null,
      national_id: member.id_number?.trim() || null,
      birth_date: member.birth_date || null,
      gender: member.gender || null,
      phone: '',
      is_vip: false,
      is_active: true,
      total_spent: 0,
      total_orders: 0,
      verification_status: 'verified',
      member_type: 'member',
    })
    if (!newCustomer) return null
    // 走 entity CRUD（非 client 直寫）
    await updateMember(member.id, { customer_id: newCustomer.id })
    return newCustomer.id
  }

  // 全部套用
  const applyAll = useCallback(async () => {
    setIsApplying(true)
    const linkedMemberIds = new Map<string, string>() // memberId -> customerId
    let linked = 0
    let created = 0
    let skipped = 0
    let failed = 0

    try {
      for (const row of rows) {
        try {
          if (row.resolution.type === 'skip') {
            skipped++
            continue
          }
          if (row.resolution.type === 'link') {
            const cid = await linkAndUpdate(row.member, row.resolution.customerId)
            linkedMemberIds.set(row.member.id, cid)
            linked++
          } else if (row.resolution.type === 'create') {
            const cid = await createAndLink(row.member)
            if (cid) {
              linkedMemberIds.set(row.member.id, cid)
              created++
            } else {
              failed++
            }
          }
        } catch (err) {
          logger.error('批次比對處理單列失敗:', row.member.chinese_name, err)
          failed++
        }
      }

      // 回寫本地 state：把連好的 customer_id 帶進 members
      if (linkedMemberIds.size > 0) {
        setMembers(prev =>
          prev.map(m => {
            const cid = linkedMemberIds.get(m.id)
            return cid ? { ...m, customer_id: cid, customer_verification_status: 'verified' } : m
          })
        )
        // 動到 customers（新建/更新）→ 讓顧客快取失效
        invalidateCustomers()
      }

      closeBatchMatch()
      return { linked, created, skipped, failed }
    } finally {
      setIsApplying(false)
    }
  }, [rows, setMembers, closeBatchMatch])

  return {
    isOpen,
    rows,
    isApplying,
    openBatchMatch,
    closeBatchMatch,
    setRowResolution,
    applyAll,
  }
}
