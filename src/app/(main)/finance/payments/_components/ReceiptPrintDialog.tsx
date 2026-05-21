'use client'
/**
 * ReceiptPrintDialog
 * 收款收據列印對話框（A4 直向）
 *
 * 兩種模式：
 * - confirmed → 收款收據
 * - refunded  → 退款收據
 */

import { forwardRef, useCallback, useRef } from 'react'
import { Money } from '@/components/ui/money'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { useWorkspaceSettings, getLogoStyle } from '@/hooks/useWorkspaceSettings'
import { SealImage } from '@/components/seal-image'
import type { Receipt } from '@/stores'

const COMPONENT_LABELS = {
  PM_CASH: '現金',
  PM_TRANSFER: '匯款',
  PM_CREDIT_CARD: '信用卡',
  PM_CHECK: '支票',
  TAX_ID_PREFIX: '統一編號：',
  PHONE_PREFIX: '電話：',
  TITLE_REFUND: '退款收據',
  TITLE_RECEIPT: '收 據',
  CODE_PREFIX: '編號：',
  DATE_PREFIX: '日期：',
  PAYER_LABEL: '受款人 / 付款人：',
  COL_ITEM: '項目',
  COL_DESCRIPTION: '說明',
  COL_AMOUNT: '金額',
  ITEM_REFUND: '退款',
  ITEM_TOUR_PAYMENT: '團費收款',
  TOTAL: '合計',
  AMOUNT_IN_WORDS_PREFIX: '新台幣（大寫）：',
  REFUND_METHOD: '退款方式',
  RECEIPT_METHOD: '收款方式',
  REFUND_ACCOUNT_PREFIX: '退款',
  RECEIPT_ACCOUNT_PREFIX: '入帳',
  ACCOUNT_SUFFIX: '帳戶：',
  HANDLER: '經手人',
  COMPANY_SEAL: '本公司印鑑',
  NOTES_PREFIX: '備註：',
  RECEIPT_TITLE_PREFIX: '收據 - ',
  DIALOG_TITLE_REFUND: '退款收據',
  DIALOG_TITLE_RECEIPT: '收款收據',
  PRINT: '列印',
  ZERO_AMOUNT: '零元整',
  YUAN_INT: '元整',
  ZERO_FILLER: '零',
} as const

interface ReceiptPrintDialogProps {
  receipt: Receipt | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const COLORS = {
  gold: '#B8A99A',
  brown: '#3a3633',
  lightBrown: '#FAF7F2',
  gray: '#4B5563',
  lightGray: '#9CA3AF',
}

// 把阿拉伯數字轉中文大寫（簡化版、含元 / 整 / 點等收據常見格式）
function numberToChinese(num: number): string {
  if (!num || isNaN(num)) return COMPONENT_LABELS.ZERO_AMOUNT
  const digits = ['零', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖']
  const units = ['', '拾', '佰', '仟']
  const bigUnits = ['', '萬', '億', '兆']
  const intPart = Math.floor(Math.abs(num))
  if (intPart === 0) return COMPONENT_LABELS.ZERO_AMOUNT

  const str = String(intPart)
  let result = ''
  let zeroFlag = false
  const len = str.length

  for (let i = 0; i < len; i++) {
    const digit = Number(str[i])
    const posFromRight = len - 1 - i
    const unitPos = posFromRight % 4
    const bigPos = Math.floor(posFromRight / 4)

    if (digit === 0) {
      zeroFlag = true
    } else {
      if (zeroFlag) {
        result += COMPONENT_LABELS.ZERO_FILLER
        zeroFlag = false
      }
      result += digits[digit] + units[unitPos]
    }

    // 每滿 4 位、加大單位（萬 / 億 / 兆）
    if (unitPos === 0 && bigPos > 0) {
      // 該段非全 0 才加
      const segStart = len - (bigPos + 1) * 4
      const segEnd = len - bigPos * 4
      const seg = str.slice(Math.max(0, segStart), segEnd)
      if (Number(seg) !== 0) {
        result += bigUnits[bigPos]
      }
      zeroFlag = false
    }
  }

  return result + COMPONENT_LABELS.YUAN_INT
}

interface PreviewProps {
  receipt: Receipt
  workspace: ReturnType<typeof useWorkspaceSettings>
}

const ReceiptPreview = forwardRef<HTMLDivElement, PreviewProps>(function ReceiptPreview(
  { receipt, workspace },
  ref
) {
  const isRefund = receipt.status === 'refunded'
  const amount = isRefund
    ? Number(receipt.refund_amount) || 0
    : Number(receipt.actual_amount) || Number(receipt.receipt_amount) || 0
  const date = isRefund
    ? (receipt.refunded_at || '').slice(0, 10)
    : receipt.receipt_date || receipt.payment_date

  const paymentMethodLabel: Record<string, string> = {
    cash: COMPONENT_LABELS.PM_CASH,
    transfer: COMPONENT_LABELS.PM_TRANSFER,
    credit_card: COMPONENT_LABELS.PM_CREDIT_CARD,
    check: COMPONENT_LABELS.PM_CHECK,
  }
  const methodName =
    receipt.payment_methods?.name ||
    paymentMethodLabel[receipt.payment_method] ||
    receipt.payment_method ||
    '-'

  return (
    <div
      ref={ref}
      style={{
        padding: '20mm 18mm',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "PingFang TC", "Microsoft JhengHei", sans-serif',
        color: COLORS.brown,
        fontSize: '13px',
        lineHeight: 1.6,
      }}
    >
      {/* 標題列 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          borderBottom: `2px solid ${COLORS.gold}`,
          paddingBottom: '12px',
          marginBottom: '20px',
        }}
      >
        <div>
          {workspace.logo_url && (
            <img
              src={workspace.logo_url}
              alt="logo"
              style={getLogoStyle('print')}
            />
          )}
          <div style={{ marginTop: '6px', fontSize: '14px', fontWeight: 600 }}>
            {workspace.legal_name || workspace.name}
          </div>
          {workspace.tax_id && (
            <div style={{ fontSize: '11px', color: COLORS.gray }}>
              {COMPONENT_LABELS.TAX_ID_PREFIX}{workspace.tax_id}
            </div>
          )}
          {workspace.address && (
            <div style={{ fontSize: '11px', color: COLORS.gray }}>{workspace.address}</div>
          )}
          {workspace.phone && (
            <div style={{ fontSize: '11px', color: COLORS.gray }}>{COMPONENT_LABELS.PHONE_PREFIX}{workspace.phone}</div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '8px',
              color: isRefund ? '#B84C4C' : COLORS.brown,
            }}
          >
            {isRefund ? COMPONENT_LABELS.TITLE_REFUND : COMPONENT_LABELS.TITLE_RECEIPT}
          </div>
          <div style={{ fontSize: '11px', color: COLORS.gray, marginTop: '4px' }}>
            {COMPONENT_LABELS.CODE_PREFIX}{receipt.receipt_number}
          </div>
          <div style={{ fontSize: '11px', color: COLORS.gray }}>{COMPONENT_LABELS.DATE_PREFIX}{date || '-'}</div>
        </div>
      </div>

      {/* 客戶 */}
      <div
        style={{
          marginBottom: '14px',
          padding: '8px 12px',
          background: COLORS.lightBrown,
          borderLeft: `3px solid ${COLORS.gold}`,
        }}
      >
        <span style={{ color: COLORS.gray, marginRight: '12px' }}>{COMPONENT_LABELS.PAYER_LABEL}</span>
        <span style={{ fontWeight: 600 }}>{receipt.customer_name || '-'}</span>
      </div>

      {/* 收款明細 */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '20px',
          border: `1px solid ${COLORS.lightGray}`,
        }}
      >
        <thead>
          <tr style={{ background: COLORS.lightBrown }}>
            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${COLORS.lightGray}` }}>
              {COMPONENT_LABELS.COL_ITEM}
            </th>
            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${COLORS.lightGray}` }}>
              {COMPONENT_LABELS.COL_DESCRIPTION}
            </th>
            <th style={{ padding: '10px', textAlign: 'right', borderBottom: `1px solid ${COLORS.lightGray}` }}>
              {COMPONENT_LABELS.COL_AMOUNT}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '10px', borderBottom: `1px solid ${COLORS.lightGray}` }}>
              {isRefund ? COMPONENT_LABELS.ITEM_REFUND : COMPONENT_LABELS.ITEM_TOUR_PAYMENT}
            </td>
            <td style={{ padding: '10px', borderBottom: `1px solid ${COLORS.lightGray}` }}>
              {receipt.tour_name || receipt.order_number || '-'}
              {isRefund && receipt.refund_notes && (
                <div style={{ fontSize: '11px', color: COLORS.gray, marginTop: '4px' }}>
                  {receipt.refund_notes}
                </div>
              )}
            </td>
            <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace', borderBottom: `1px solid ${COLORS.lightGray}` }}>
              <Money amount={amount} />
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr style={{ background: COLORS.lightBrown }}>
            <td colSpan={2} style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>
              {COMPONENT_LABELS.TOTAL}
            </td>
            <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '15px' }}>
              <Money amount={amount} />
            </td>
          </tr>
        </tfoot>
      </table>

      {/* 大寫金額 + 收款方式 */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <span style={{ color: COLORS.gray }}>{COMPONENT_LABELS.AMOUNT_IN_WORDS_PREFIX}</span>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>{numberToChinese(amount)}</span>
        </div>
        <div>
          <span style={{ color: COLORS.gray }}>{isRefund ? COMPONENT_LABELS.REFUND_METHOD : COMPONENT_LABELS.RECEIPT_METHOD}：</span>
          <span>{methodName}</span>
        </div>
      </div>

      {/* 收款帳戶（如果有 transfer） */}
      {receipt.receipt_account && (
        <div style={{ marginBottom: '16px', fontSize: '12px', color: COLORS.gray }}>
          {isRefund ? COMPONENT_LABELS.REFUND_ACCOUNT_PREFIX : COMPONENT_LABELS.RECEIPT_ACCOUNT_PREFIX}{COMPONENT_LABELS.ACCOUNT_SUFFIX}{receipt.receipt_account}
        </div>
      )}

      {/* 印章 + 簽名區 */}
      <div
        style={{
          marginTop: '40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ width: '40%' }}>
          <div style={{ borderBottom: `1px solid ${COLORS.gray}`, height: '36px' }} />
          <div style={{ fontSize: '11px', color: COLORS.gray, marginTop: '4px' }}>{COMPONENT_LABELS.HANDLER}</div>
        </div>
        <div
          style={{
            width: '40%',
            position: 'relative',
            textAlign: 'center',
            minHeight: '80px',
          }}
        >
          <SealImage
            url={workspace.invoice_seal_image_url}
            size={110}
            rotate={-6}
            opacity={0.85}
          />
          <div
            style={{
              borderBottom: `1px solid ${COLORS.gray}`,
              marginTop: '8px',
            }}
          />
          <div style={{ fontSize: '11px', color: COLORS.gray, marginTop: '4px' }}>{COMPONENT_LABELS.COMPANY_SEAL}</div>
        </div>
      </div>

      {/* 備註 */}
      {receipt.notes && !isRefund && (
        <div style={{ marginTop: '24px', fontSize: '11px', color: COLORS.gray }}>
          {COMPONENT_LABELS.NOTES_PREFIX}{receipt.notes}
        </div>
      )}
    </div>
  )
})

export function ReceiptPrintDialog({ receipt, open, onOpenChange }: ReceiptPrintDialogProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const workspace = useWorkspaceSettings()

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

    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${COMPONENT_LABELS.RECEIPT_TITLE_PREFIX}${receipt?.receipt_number || ''}</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: white; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        </style>
      </head>
      <body>${printRef.current.innerHTML}</body>
      </html>
    `)
    iframeDoc.close()

    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 1000)
    }, 100)
  }, [receipt?.receipt_number])

  if (!receipt) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        level={1}
        className="w-[95vw] max-w-[900px] h-[90vh] overflow-hidden flex flex-col p-0"
      >
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b bg-morandi-background">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              {receipt.status === 'refunded' ? COMPONENT_LABELS.DIALOG_TITLE_REFUND : COMPONENT_LABELS.DIALOG_TITLE_RECEIPT} — {receipt.receipt_number}
            </DialogTitle>
            <Button variant="soft-gold" size="sm" onClick={handlePrint} className="gap-2">
              <Printer size={16} />
              {COMPONENT_LABELS.PRINT}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-morandi-container p-4 flex items-start justify-center">
          <div
            className="shadow-lg bg-white"
            style={{ width: '210mm', minHeight: '297mm', maxWidth: '100%' }}
          >
            <ReceiptPreview ref={printRef} receipt={receipt} workspace={workspace} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
