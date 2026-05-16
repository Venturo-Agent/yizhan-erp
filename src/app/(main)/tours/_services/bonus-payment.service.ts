/**
 * bonus-payment.service — 把 bonus_setting 衍生成「公司請款」一張請款單
 *
 * 設計：
 * - 一筆 bonus_setting（OP / 業務 / 團隊獎金）對應一張 payment_request
 * - request_type='獎金'：calc service 會自動 filter 掉、不會回頭算進付款總額
 * - request_category='company'、expense_type='SAL'：歸到公司請款 / 薪資類
 * - 創完寫回 setting.payment_request_id 鎖定、避免重複生
 */

import { supabase } from '@/lib/supabase/client'
import {
  createPaymentRequest,
  createPaymentRequestItem,
  invalidatePaymentRequests,
  invalidatePaymentRequestItems,
} from '@/data'
import type { TourBonusSetting } from '@/types/bonus.types'
import { BonusSettingType } from '@/types/bonus.types'
import { generateCompanyPaymentRequestCode } from '@/lib/codes'

const TYPE_LABEL_MAP: Record<BonusSettingType, string> = {
  [BonusSettingType.PROFIT_TAX]: '營收稅額',
  [BonusSettingType.OP_BONUS]: 'OP 獎金',
  [BonusSettingType.SALE_BONUS]: '業務獎金',
  [BonusSettingType.TEAM_BONUS]: '團隊獎金',
  [BonusSettingType.ADMINISTRATIVE_EXPENSES]: '行政費用',
}

interface GenerateBonusRequestParams {
  setting: TourBonusSetting
  amount: number
  disbursementDate: string // YYYY-MM-DD
  payeeName: string
  tourCode: string
  tourName: string
  /** 多筆同時生時用：caller 維護同 batch 已使用 code、避免序號重複。空陣列 = 自己查 DB */
  codeBuffer?: { code?: string }[]
}

export async function generateBonusPaymentRequest({
  setting,
  amount,
  disbursementDate,
  payeeName,
  tourCode,
  tourName,
  codeBuffer,
}: GenerateBonusRequestParams): Promise<{ id: string; code: string }> {
  const typeLabel = TYPE_LABEL_MAP[setting.type as BonusSettingType] || '獎金'
  const ym = disbursementDate.slice(0, 7) // YYYY-MM
  const description = `${ym} ${typeLabel}${payeeName ? ` - ${payeeName}` : ''}`

  // 0. 找這個 workspace 的「匯款」付款方式（type='payment' 才是出款方向）
  const { data: pm } = await supabase
    .from('payment_methods')
    .select('id')
    .eq('workspace_id', setting.workspace_id)
    .eq('name', '匯款')
    .eq('type', 'payment')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()
  const paymentMethodId = (pm as { id?: string } | null)?.id ?? null

  // 0.5. 算 code（用 BNS-YYYYMM-NNN、跟薪資 SAL- 分開）— RPC + advisory lock 防競態
  // codeBuffer 參數已 deprecated（RPC 內部 advisory lock 比前端 buffer 更可靠、保留 param 不破 API）
  void codeBuffer
  const code = await generateCompanyPaymentRequestCode(
    setting.workspace_id,
    'BNS',
    disbursementDate
  )

  // 1. 創請款單（公司請款、獎金類、匯款）
  const request = (await createPaymentRequest({
    code,
    request_number: code,
    request_date: disbursementDate,
    request_type: '獎金',
    request_category: 'company',
    expense_type: 'BNS',
    tour_id: setting.tour_id,
    tour_code: tourCode,
    tour_name: tourName,
    supplier_id: null,
    supplier_name: payeeName,
    amount,
    total_amount: amount,
    status: 'pending',
    payment_method_id: paymentMethodId,
    notes: `${tourCode} ${typeLabel} 自動生成（從結案獎金設定衍生）`,
  } as never)) as unknown as { id: string; code: string }

  // 把新 code append 進 buffer、caller 下一筆 generator 不會撞號
  if (codeBuffer) codeBuffer.push({ code })

  // 2. 創單一請款項目
  // - category='BNS'：對應公司請款 expense_type 選項（獎金）、避免 UI Select 顯示空白
  //   request_type='獎金' 才是 calc service 用來過濾循環的關鍵字、跟這個 category 無關
  // - custom_request_date 跟 header request_date 對齊、避免日期欄位 fallback 跑掉
  await createPaymentRequestItem({
    request_id: request.id,
    item_number: 1,
    sort_order: 0,
    category: 'BNS',
    supplier_name: payeeName,
    description,
    quantity: 1,
    unit_price: amount,
    subtotal: amount,
    custom_request_date: disbursementDate,
    payment_method_id: paymentMethodId,
  } as never)

  // 3. 回寫 setting.payment_request_id 鎖定
  // (DB types 還沒重新 generate 包含新欄位、用 as never 跨過 type check)
  const { error } = await supabase
    .from('tour_bonus_settings')
    .update({
      payment_request_id: request.id,
      disbursement_date: disbursementDate,
    } as never)
    .eq('id', setting.id)

  if (error) throw error

  // 4. invalidate SWR cache（請款單 + 請款項目都要、不然剛開 dialog 載不到新 item）
  await Promise.all([invalidatePaymentRequests(), invalidatePaymentRequestItems()])

  return request
}
