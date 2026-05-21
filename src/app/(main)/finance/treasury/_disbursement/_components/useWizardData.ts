/**
 * useWizardData.ts
 * 出納單 Wizard 資料載入 hook
 * 拆分自 CreateDisbursementWizardDialog.tsx 2026-05-16
 *
 * 職責：
 * - 撈 bank_accounts（is_disbursement_eligible）
 * - 撈 payment_request_items（含供應商 / 代墊員工 join）
 * - 撈 disbursement_order_items（確認哪些 item 被佔用）
 * - 編輯模式：預填現有出納單的帳戶 / 手續費 / 出帳日 / 付款方式 / 已選品項
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { dynamicFrom } from '@/lib/supabase/typed-client'
import { logger } from '@/lib/utils/logger'
import { formatDate } from '@/lib/utils/format-date'
import type { DisbursementOrder } from '@/stores/types'
import type { BankAccountOption, UnbilledItem } from './disbursement-wizard-types'

function getNextThursday(): Date {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7
  const nextThursday = new Date(today)
  nextThursday.setDate(today.getDate() + daysUntilThursday)
  return nextThursday
}

export function getInitialDisbursementDate() {
  return formatDate(getNextThursday())
}

export interface PreFilledData {
  bankAccounts: BankAccountOption[]
  pickedItemIds: string[]
  currentBank: BankAccountOption | null
  currentFee: number
  feeDistribution: 'equal' | 'proportional'
  disbursementDate: string
  paymentMethodId: string
}

interface UseWizardDataOptions {
  open: boolean
  workspaceId: string | undefined
  editingOrder: DisbursementOrder | null | undefined
  /** 編輯模式下預填回來的 setter */
  onPreFill?: (preFilledData: PreFilledData) => void
}

interface UseWizardDataResult {
  bankAccounts: BankAccountOption[]
  unbilledItems: UnbilledItem[]
  loading: boolean
}

export function useWizardData({
  open,
  workspaceId,
  editingOrder,
  onPreFill,
}: UseWizardDataOptions): UseWizardDataResult {
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([])
  const [unbilledItems, setUnbilledItems] = useState<UnbilledItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !workspaceId) return
    setLoading(true)
    void (async () => {
      try {
        // editing 模式多撈一次：本 order 已 link 的 items
        const linkedDoiRowsPromise = editingOrder
          ? dynamicFrom('disbursement_order_items')
              .select('payment_request_item_id')
              .eq('disbursement_order_id', editingOrder.id)
          : Promise.resolve({ data: [] as { payment_request_item_id: string }[] })

        const [{ data: banks }, { data: items }, { data: lockedDoiRows }, { data: linkedDoiRows }] =
          await Promise.all([
            supabase
              .from('bank_accounts')
              .select('id, name, bank_code, bank_name, is_disbursement_eligible, cross_bank_fee')
              .eq('workspace_id', workspaceId)
              .eq('is_active', true)
              .eq('is_disbursement_eligible', true)
              .order('is_default', { ascending: false }),
            supabase
              .from('payment_request_items')
              .select(`
                id, request_id, description, subtotal, supplier_id, supplier_name, tour_id,
                advanced_by, advanced_by_name, payee_employee_id,
                payment_requests:request_id(code, tour_name, status, disbursement_order_id, request_date, created_by_name),
                suppliers:supplier_id(bank_code, bank_name),
                advanced_by_employee:employees!payment_request_items_advanced_by_fkey(chinese_name, display_name, bank_code, bank_name),
                payee_employee:employees!payment_request_items_payee_employee_id_fkey(chinese_name, display_name, bank_code, bank_name)
              `)
              .eq('workspace_id', workspaceId),
            // 全 workspace 的 disbursement_order_items（決定哪些 item 被佔用）
            dynamicFrom('disbursement_order_items')
              .select('payment_request_item_id, disbursement_order_id')
              .eq('workspace_id', workspaceId),
            linkedDoiRowsPromise,
          ])

        // editing：本單 link 的 item ids（要預勾）
        const inCurrentLinked = new Set(
          ((linkedDoiRows ?? []) as { payment_request_item_id: string }[]).map(
            r => r.payment_request_item_id,
          ),
        )
        // 被其他 DOI 佔用的 item ids（不能勾）
        const lockedInOtherDoi = new Set(
          (
            (lockedDoiRows ?? []) as {
              payment_request_item_id: string
              disbursement_order_id: string
            }[]
          )
            .filter(r => !editingOrder || r.disbursement_order_id !== editingOrder.id)
            .map(r => r.payment_request_item_id),
        )

        // typegen 還沒含 is_disbursement_eligible、cast 經 unknown 繞過
        const parsedBanks = (banks ?? []) as unknown as BankAccountOption[]
        setBankAccounts(parsedBanks)

        type RawItem = {
          id: string
          request_id: string
          description: string | null
          subtotal: number | null
          supplier_id: string | null
          supplier_name: string | null
          tour_id: string | null
          advanced_by: string | null
          advanced_by_name: string | null
          payee_employee_id: string | null
          payment_requests?: {
            code: string | null
            tour_name: string | null
            status: string | null
            disbursement_order_id: string | null
            request_date: string | null
            created_by_name: string | null
          } | null
          suppliers?: { bank_code: string | null; bank_name: string | null } | null
          advanced_by_employee?: {
            chinese_name: string | null
            display_name: string | null
            bank_code: string | null
            bank_name: string | null
          } | null
          payee_employee?: {
            chinese_name: string | null
            display_name: string | null
            bank_code: string | null
            bank_name: string | null
          } | null
        }

        // 註：generated types 尚未含 advanced_by FK relation、用 unknown cast 繞、待 regen
        const filtered = ((items ?? []) as unknown as RawItem[]).filter(it => {
          const reqStatus = it.payment_requests?.status
          const linkedOldStyle = it.payment_requests?.disbursement_order_id
          if (editingOrder) {
            if (inCurrentLinked.has(it.id)) return true
            if (lockedInOtherDoi.has(it.id)) return false
            if (linkedOldStyle && linkedOldStyle !== editingOrder.id) return false
            return reqStatus === 'pending'
          }
          if (lockedInOtherDoi.has(it.id)) return false
          return !linkedOldStyle && reqStatus === 'pending'
        })

        setUnbilledItems(
          filtered.map(it => {
            const advEmpName =
              it.advanced_by_employee?.display_name ??
              it.advanced_by_employee?.chinese_name ??
              null
            const advName = advEmpName ?? it.advanced_by_name
            const advBankCode = it.advanced_by_employee?.bank_code ?? null
            const advBankName = it.advanced_by_employee?.bank_name ?? null
            const hasAdvanced = Boolean(it.advanced_by)

            const payeeEmpName =
              it.payee_employee?.display_name ??
              it.payee_employee?.chinese_name ??
              null
            const payeeBankCode = it.payee_employee?.bank_code ?? null
            const payeeBankName = it.payee_employee?.bank_name ?? null
            const hasPayeeEmployee = Boolean(it.payee_employee_id)

            // 付款對象（payer_label）= 原本要付給誰、代墊不改寫
            //   1. payee_employee_id（公司直接付員工：獎金 / 薪資）→ 員工名（員工）
            //   2. 其他（含代墊）→ 供應商名（代墊只是這次員工先墊、原始對象還是供應商）
            // 對方銀行（payer_bank）= 實際要轉錢去哪
            //   1. 代墊 → 員工銀行（公司還錢給員工）
            //   2. payee_employee → 員工銀行
            //   3. 其他 → 供應商銀行
            let payerLabel: string
            let payerBankCode: string | null
            let payerBankName: string | null
            if (hasPayeeEmployee && payeeEmpName) {
              payerLabel = `${payeeEmpName}（員工）`
              payerBankCode = payeeBankCode
              payerBankName = payeeBankName
            } else {
              payerLabel = it.supplier_name ?? '-'
              if (hasAdvanced) {
                payerBankCode = advBankCode
                payerBankName = advBankName
              } else {
                payerBankCode = it.suppliers?.bank_code ?? null
                payerBankName = it.suppliers?.bank_name ?? null
              }
            }

            return {
              id: it.id,
              request_id: it.request_id,
              request_code: it.payment_requests?.code ?? null,
              request_date: it.payment_requests?.request_date ?? null,
              requester_name: it.payment_requests?.created_by_name ?? null,
              description: it.description,
              subtotal: Number(it.subtotal ?? 0),
              supplier_id: it.supplier_id,
              supplier_name: it.supplier_name,
              supplier_bank_code: it.suppliers?.bank_code ?? null,
              supplier_bank_name: it.suppliers?.bank_name ?? null,
              tour_id: it.tour_id,
              tour_name: it.payment_requests?.tour_name ?? null,
              advanced_by: it.advanced_by,
              advanced_by_name: advName,
              advanced_by_bank_code: advBankCode,
              advanced_by_bank_name: advBankName,
              payee_employee_id: it.payee_employee_id, // 2026-05-21 加：給 wizard unique payer 計算用
              payer_label: payerLabel,
              payer_bank_code: payerBankCode,
              payer_bank_name: payerBankName,
            }
          }),
        )

        // editing 模式：回填現有出納單資料
        if (editingOrder && onPreFill) {
          const extra = editingOrder as unknown as {
            bank_account_id?: string | null
            payment_method_id?: string | null
            total_fee?: number | null
            fee_distribution?: 'equal' | 'proportional' | null
          }
          const matchedBank = parsedBanks.find(b => b.id === extra.bank_account_id) ?? null
          onPreFill({
            bankAccounts: parsedBanks,
            pickedItemIds: [...inCurrentLinked],
            currentBank: matchedBank,
            currentFee: Number(extra.total_fee ?? 0),
            feeDistribution: extra.fee_distribution ?? 'proportional',
            disbursementDate: editingOrder.disbursement_date ?? '',
            paymentMethodId: extra.payment_method_id ?? '',
          })
        }
      } catch (err) {
        logger.error('載入 wizard 資料失敗', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [open, workspaceId, editingOrder, onPreFill])

  return { bankAccounts, unbilledItems, loading }
}
