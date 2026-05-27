'use client'
/**
 * DisbursementPrintDialog
 * 出納單列印預覽對話框
 *
 * 功能：
 * - 顯示出納單即時預覽
 * - 使用 iframe 列印確保穩定
 */

import { useCallback, useRef, useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import type { DisbursementOrder, PaymentRequest, PaymentRequestItem } from '@/stores/types'
import { supabase } from '@/lib/supabase/client'
import { PrintDisbursementPreview } from './PrintDisbursementPreview'
import { logger } from '@/lib/utils/logger'
import { useTranslations } from 'next-intl'

import { Spinner } from '@/components/ui/spinner'
interface DisbursementPrintDialogProps {
  order: DisbursementOrder | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DisbursementPrintDialog({
  order,
  open,
  onOpenChange,
}: DisbursementPrintDialogProps) {
  const t = useTranslations('finance')
  const printRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [paymentRequestItems, setPaymentRequestItems] = useState<PaymentRequestItem[]>([])
  // 2026-05-21 加：per item 手續費 map（從 disbursement_order_items 撈、給 PrintItemsTable 顯示）
  const [feeByItemId, setFeeByItemId] = useState<Map<string, number>>(new Map())
  // 付款方式 + 出款帳戶（列印頁底部顯示）
  const [paymentMethod, setPaymentMethod] = useState<{
    name: string
  } | null>(null)
  const [bankAccount, setBankAccount] = useState<{
    name: string
    bank_name: string | null
    account_number: string | null
  } | null>(null)

  // 直接從 Supabase 取得關聯的請款單和項目（FK 反查、不再讀 array）
  useEffect(() => {
    if (!open || !order?.id) {
      setPaymentRequests([])
      setPaymentRequestItems([])
      setFeeByItemId(new Map())
      setPaymentMethod(null)
      setBankAccount(null)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        // 取得綁定到此出納單的請款單
        const { data: requests } = await supabase
          .from('payment_requests')
          .select(
            'id, code, request_number, request_type, request_category, amount, total_amount, status, tour_id, tour_code, tour_name, supplier_name, expense_type, notes, workspace_id, created_at, created_by_name'
          )
          .eq('disbursement_order_id', order.id)
          .limit(500)

        const requestIds = (requests || []).map(r => r.id)
        if (requestIds.length === 0) {
          setPaymentRequests([])
          setPaymentRequestItems([])
          return
        }

        // 取得請款項目（2026-05-21 加 payee_employee join、公司請款顯示員工名）
        const { data: items } = await supabase
          .from('payment_request_items')
          .select(
            'id, request_id, description, quantity, unit_price, subtotal, category, tour_id, supplier_id, supplier_name, suppliers:supplier_id(name), sort_order, item_number, notes, workspace_id, advanced_by, advanced_by_name, advanced_by_employee:employees!payment_request_items_advanced_by_fkey(chinese_name, display_name), payee_employee_id, payee_employee:employees!payment_request_items_payee_employee_id_fkey(chinese_name, display_name)'
          )
          .in('request_id', requestIds)
          .limit(500)

        setPaymentRequests((requests || []) as unknown as PaymentRequest[])
        setPaymentRequestItems((items || []) as unknown as PaymentRequestItem[])

        // 2026-05-21 加：撈 disbursement_order_items 的 fee_amount per item、給 PrintItemsTable 顯示「(含 X 元手續費)」
        const { data: doiData } = await supabase
          .from('disbursement_order_items')
          .select('payment_request_item_id, fee_amount')
          .eq('disbursement_order_id', order.id)
        const feeMap = new Map<string, number>()
        for (const doi of doiData || []) {
          const itemId = (doi as { payment_request_item_id?: string | null })
            .payment_request_item_id
          const fee = Number((doi as { fee_amount?: number | null }).fee_amount || 0)
          if (itemId && fee > 0) feeMap.set(itemId, fee)
        }
        setFeeByItemId(feeMap)

        // 撈付款方式 + 出款帳戶（列印頁底部顯示）
        const orderRaw = order as unknown as {
          payment_method_id?: string | null
          bank_account_id?: string | null
        }
        if (orderRaw.payment_method_id) {
          const { data: pm } = await supabase
            .from('payment_methods')
            .select('name')
            .eq('id', orderRaw.payment_method_id)
            .maybeSingle()
          setPaymentMethod((pm as typeof paymentMethod) ?? null)
        } else {
          setPaymentMethod(null)
        }
        if (orderRaw.bank_account_id) {
          const { data: ba } = await supabase
            .from('bank_accounts')
            .select('name, bank_name, account_number')
            .eq('id', orderRaw.bank_account_id)
            .maybeSingle()
          setBankAccount((ba as typeof bankAccount) ?? null)
        } else {
          setBankAccount(null)
        }
      } catch (error) {
        logger.error(t('disbursementLoadFailed'), error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [open, order])

  // 使用 iframe 列印（最可靠的方式）
  const handlePrint = useCallback(() => {
    if (!printRef.current) return

    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    iframe.style.left = '-9999px'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      document.body.removeChild(iframe)
      return
    }

    // 寫入列印內容（橫向 A4）
    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${t('disbursementDocTitle')} - ${order?.order_number}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #4B5563;
            background: white;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          /* 不設定全局 border，讓 inline style 控制 */
          th, td {
            vertical-align: middle;
          }

          .tour-name {
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        </style>
      </head>
      <body>
        ${printRef.current.innerHTML}
      </body>
      </html>
    `)
    iframeDoc.close()

    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 100)
  }, [order?.order_number])

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        level={1}
        className="w-[95vw] max-w-[1200px] h-[90vh] overflow-hidden flex flex-col p-0"
      >
        {/* 標題列 */}
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b bg-morandi-background">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              {t('disbursementPrintPreview')} - {order.order_number}
            </DialogTitle>
            <div className="flex items-center gap-2 no-print">
              <Button variant="soft-gold" size="sm" onClick={handlePrint} className="gap-2">
                <Printer size={16} />
                {t('disbursementPrint')}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 預覽區域 - A4 比例容器 */}
        <div className="flex-1 overflow-auto bg-morandi-container p-4 flex items-start justify-center">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Spinner size="lg" className="text-morandi-secondary" />
              <span className="ml-2 text-morandi-secondary">{t('disbursementLoading')}</span>
            </div>
          ) : (
            <div
              className="shadow-lg bg-card"
              style={{
                width: '210mm',
                minHeight: '297mm',
                maxWidth: '100%',
              }}
            >
              <PrintDisbursementPreview
                ref={printRef}
                order={order}
                paymentRequests={paymentRequests}
                paymentRequestItems={paymentRequestItems}
                feeByItemId={feeByItemId}
                paymentMethod={paymentMethod}
                bankAccount={bankAccount}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
