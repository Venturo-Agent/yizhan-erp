import { useCallback } from 'react'
import { usePayments } from '@/app/(main)/finance/payments/_hooks/usePayments'
import { useWorkspaceId } from '@/lib/workspace-context'
import { RequestFormData, BatchRequestFormData, RequestItem } from '../_types'
import {
  generateRequestNo,
  generateCompanyPaymentRequestCode,
} from '@/lib/codes'
import { EXPENSE_TYPE_CONFIG, CompanyExpenseType } from '@/stores/types/finance.types'
import { recalculateExpenseStats } from '@/app/(main)/finance/payments/_services/expense-core.service'
import { useTranslations } from 'next-intl'
import { logger } from '@/lib/utils/logger'

export function useRequestOperations() {
  const t = useTranslations('finance')
  const { payment_requests, createPaymentRequest, addPaymentItems, deletePaymentRequest } =
    usePayments()
  const workspaceId = useWorkspaceId()

  // 根據團號預估請款單編號 (僅供 UI preview 用、可能不準)
  // 真正建單要用 generateRequestCodeAsync (RPC + advisory lock 防 race)
  const generateRequestCode = useCallback(
    (tourCode: string) => {
      const existingCount = payment_requests.filter(
        r => r.tour_code === tourCode || r.code?.startsWith(`${tourCode}-I`)
      ).length
      const nextNumber = existingCount + 1
      return `${tourCode}-I${nextNumber.toString().padStart(2, '0')}`
    },
    [payment_requests]
  )

  // 透過中央 codes module（RPC + advisory lock） — 實際建單時用這個
  const generateRequestCodeAsync = useCallback(
    (tourCode: string) => generateRequestNo(tourCode),
    []
  )

  // Generate request number preview (舊方法，保留向下相容)
  const generateRequestNumber = useCallback(() => {
    const year = new Date().getFullYear()
    const count = payment_requests.length + 1
    return `PR${year}${count.toString().padStart(4, '0')}`
  }, [payment_requests.length])

  // 生成公司請款單編號 — 透過中央 codes module（RPC + advisory lock）
  const generateCompanyRequestCode = useCallback(
    async (expenseType: CompanyExpenseType, requestDate: string) => {
      if (!workspaceId) throw new Error(t('requestOperationsCannotGetWorkspace'))
      return generateCompanyPaymentRequestCode(workspaceId, expenseType, requestDate)
    },
    [workspaceId, t]
  )

  // Create single request (支援團體請款和公司請款)
  const createRequest = useCallback(
    async (
      formData: RequestFormData,
      items: RequestItem[],
      tourName: string,
      tourCode: string,
      orderNumber?: string,
      createdByName?: string, // 請款人姓名
      codeOverride?: string // 外部預先產好 code（用於 group by 日期拆多張時避免重複編號）
    ) => {
      if (!items || items.length === 0) return null
      if (!workspaceId) throw new Error(t('requestOperationsCannotGetWorkspace'))

      // 從品項推算請款單級 supplier（單 supplier → 寫該值、多 supplier → NULL）
      // 業務語意：「請款單跨多家 supplier 時、容器級不綁、報表用品項層」
      const uniqueSupplierIds = [
        ...new Set(items.map(i => i.supplier_id).filter((v): v is string => !!v)),
      ]
      const reqSupplierId = uniqueSupplierIds.length === 1 ? uniqueSupplierIds[0] : null
      const reqSupplierName = uniqueSupplierIds.length === 1
        ? items.find(i => i.supplier_id === reqSupplierId)?.supplierName ?? null
        : null

      // 根據請款類別決定編號和類型
      const isCompanyRequest = formData.request_category === 'company'

      if (isCompanyRequest) {
        // 公司請款
        if (!formData.expense_type) {
          throw new Error(t('requestOperationsCompanyExpenseTypeRequired'))
        }

        const expenseType = formData.expense_type as CompanyExpenseType
        const requestCode =
          codeOverride || (await generateCompanyRequestCode(expenseType, formData.request_date))
        const expenseTypeName = EXPENSE_TYPE_CONFIG[expenseType]?.name || expenseType

        // Create company payment request
        const request = await createPaymentRequest({
          workspace_id: workspaceId,
          code: requestCode,
          request_number: requestCode,
          request_date: formData.request_date,
          amount: 0,
          status: 'pending',
          notes: formData.notes,
          request_type: expenseTypeName,
          request_category: 'company',
          expense_type: expenseType,
          supplier_id: reqSupplierId,
          supplier_name: reqSupplierName,
          created_by: formData.created_by || undefined,
          created_by_name: createdByName || undefined,
          is_special_billing: formData.is_special_billing,
          payment_method_id: formData.payment_method_id || null,
        })

        // Batch insert all items — 失敗時刪除剛建的請款單
        try {
          await addPaymentItems(
            request.id,
            items.map((item, i) => ({
              category: item.category,
              supplier_id: item.supplier_id,
              supplier_name: item.supplierName,
              description: item.description,
              unit_price: item.unit_price,
              quantity: item.quantity,
              notes: '',
              sort_order: i + 1,
              // 2026-05-14：item.tour_id 帶 parent 或 client 各自選；代墊人走 supplier_id
              tour_id: (item as unknown as { tour_id?: string }).tour_id || formData.tour_id || null,
              payment_method_id: item.payment_method_id || formData.payment_method_id || null,
              advanced_by: item.advanced_by || null,
              advanced_by_name: item.advanced_by_name || null,
            }))
          )
        } catch (itemError) {
          logger.error('新增請款項目失敗，回滾請款單:', itemError)
          await deletePaymentRequest(request.id).catch(() => {})
          throw itemError
        }

        return request
      } else {
        // 團體請款
        if (!formData.tour_id) return null

        // 生成請款單編號 — 透過 RPC (advisory lock 防 race)、或用外部 override
        const requestCode = codeOverride || (await generateRequestCodeAsync(tourCode))

        // Create payment request (明確傳入 workspace_id)
        const request = await createPaymentRequest({
          workspace_id: workspaceId,
          tour_id: formData.tour_id,
          code: requestCode,
          request_number: requestCode,
          tour_code: tourCode, // 保存團號供查詢用
          tour_name: tourName,
          order_id: formData.order_id || undefined,
          order_number: orderNumber,
          request_date: formData.request_date,
          amount: 0,
          status: 'pending',
          notes: formData.notes,
          request_type: t('requestOperationsSupplierExpense'),
          request_category: 'tour',
          supplier_id: reqSupplierId,
          supplier_name: reqSupplierName,
          created_by: formData.created_by || undefined,
          created_by_name: createdByName || undefined,
          is_special_billing: formData.is_special_billing,
          payment_method_id: formData.payment_method_id || null,
        })

        // Batch insert all items — 失敗時刪除剛建的請款單
        try {
          await addPaymentItems(
            request.id,
            items.map((item, i) => ({
              category: item.category,
              supplier_id: item.supplier_id,
              supplier_name: item.supplierName,
              description: item.description,
              unit_price: item.unit_price,
              quantity: item.quantity,
              notes: '',
              sort_order: i + 1,
              // 2026-05-14：item.tour_id 帶 parent 或 client 各自選；代墊人走 supplier_id
              tour_id: (item as unknown as { tour_id?: string }).tour_id || formData.tour_id || null,
              payment_method_id: item.payment_method_id || formData.payment_method_id || null,
              advanced_by: item.advanced_by || null,
              advanced_by_name: item.advanced_by_name || null,
            }))
          )
        } catch (itemError) {
          logger.error('新增請款項目失敗，回滾請款單:', itemError)
          await deletePaymentRequest(request.id).catch(() => {})
          throw itemError
        }

        // 重算團成本 (already handled inside addItems, but ensure for tour)
        if (formData.tour_id) {
          await recalculateExpenseStats(formData.tour_id)
        }

        return request
      }
    },
    [
      createPaymentRequest,
      addPaymentItems,
      deletePaymentRequest,
      generateRequestCodeAsync,
      generateCompanyRequestCode,
      workspaceId,
      t,
    ]
  )

  // Create batch requests
  const createBatchRequests = useCallback(
    async (
      formData: BatchRequestFormData,
      items: RequestItem[],
      tourIds: string[],
      tours: Array<{ id: string; code: string; name: string }>
    ) => {
      if (tourIds.length === 0 || items.length === 0) return []
      if (!workspaceId) throw new Error(t('requestOperationsCannotGetWorkspace'))

      const createdRequests = []

      for (const tourId of tourIds) {
        const selectedTour = tours.find(t => t.id === tourId)
        if (!selectedTour) continue

        // 生成請款單編號 — 透過 RPC (advisory lock 防 race)
        const requestCode = await generateRequestCodeAsync(selectedTour.code)

        // Create payment request (明確傳入 workspace_id)
        const request = await createPaymentRequest({
          workspace_id: workspaceId,
          tour_id: tourId,
          code: requestCode,
          request_number: requestCode,
          tour_code: selectedTour.code, // 保存團號供查詢用
          tour_name: selectedTour.name,
          request_date: formData.request_date,
          amount: 0,
          status: 'pending',
          notes: formData.notes,
          request_type: t('requestOperationsSupplierExpense'), // Default value for now
          payment_method_id: formData.payment_method_id || null,
        })

        // Batch insert all items — 失敗時刪除剛建的請款單
        try {
          await addPaymentItems(
            request.id,
            items.map((item, i) => ({
              category: item.category,
              supplier_id: item.supplier_id,
              supplier_name: item.supplierName,
              description: item.description,
              unit_price: item.unit_price,
              quantity: item.quantity,
              notes: '',
              sort_order: i + 1,
              payment_method_id: item.payment_method_id || formData.payment_method_id || null,
              advanced_by: item.advanced_by || null,
              advanced_by_name: item.advanced_by_name || null,
            }))
          )
        } catch (itemError) {
          logger.error('新增請款項目失敗，回滾請款單:', itemError)
          await deletePaymentRequest(request.id).catch(() => {})
          throw itemError
        }

        createdRequests.push(request)

        // 重算團成本 (already handled inside addItems)
        await recalculateExpenseStats(tourId)
      }

      return createdRequests
    },
    [
      createPaymentRequest,
      addPaymentItems,
      deletePaymentRequest,
      generateRequestCodeAsync,
      workspaceId,
      t,
    ]
  )

  return {
    generateRequestNumber,
    generateRequestCode, // sync preview (UI 用)
    generateRequestCodeAsync, // RPC + advisory lock (真正建單用)
    generateCompanyRequestCode,
    createRequest,
    createBatchRequests,
  }
}
