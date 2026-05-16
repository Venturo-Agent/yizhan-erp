'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

const PAGE_LABELS = {
  VOUCHER_DETAIL_TITLE: '傳票明細',
  VOUCHER_NO: '傳票編號',
  DATE: '日期',
  AMOUNT: '金額',
  STATUS: '狀態',
  MEMO_LABEL: '說明',
} as const

interface JournalVoucher {
  id: string
  voucher_no: string
  voucher_date: string
  memo: string | null
  status: string
  total_debit: number
  total_credit: number
}

interface JournalLine {
  id: string
  line_no: number
  account_id: string
  description: string | null
  debit_amount: number
  credit_amount: number
  account?: {
    code: string
    name: string
  }
}

interface VoucherDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  voucher: JournalVoucher | null
}

const statusConfig = {
  draft: { label: '草稿', variant: 'secondary' as const },
  posted: { label: '已過帳', variant: 'default' as const },
  reversed: { label: '已反沖', variant: 'destructive' as const },
  locked: { label: '已鎖定', variant: 'outline' as const },
}

export function VoucherDetailDialog({ open, onOpenChange, voucher }: VoucherDetailDialogProps) {
  const [lines, setLines] = useState<JournalLine[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && voucher) {
      loadLines()
    }
  }, [open, voucher])

  const loadLines = async () => {
    if (!voucher) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('journal_lines')
        .select(
          `
          *,
          account:chart_of_accounts(code, name)
        `
        )
        .eq('voucher_id', voucher.id)
        .order('line_no')

      if (error) throw error
      setLines((data || []) as unknown as typeof lines)
    } catch (error) {
      logger.error('載入分錄失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!voucher) return null

  const config = statusConfig[voucher.status as keyof typeof statusConfig]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1} className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{PAGE_LABELS.VOUCHER_DETAIL_TITLE}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 傳票資訊 */}
          <div className="grid grid-cols-4 gap-6 p-4 bg-muted/50 rounded-lg">
            <div>
              <div className="text-xs text-muted-foreground mb-1">{PAGE_LABELS.VOUCHER_NO}</div>
              <div className="font-mono font-semibold text-base">{voucher.voucher_no}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{PAGE_LABELS.DATE}</div>
              <div className="font-medium text-base">{voucher.voucher_date}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{PAGE_LABELS.AMOUNT}</div>
              <div className="font-mono text-base">{voucher.total_debit.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{PAGE_LABELS.STATUS}</div>
              <Badge variant={config.variant}>{config.label}</Badge>
            </div>
          </div>

          {/* 說明 */}
          {voucher.memo && (
            <div className="p-3 bg-status-info/10 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">{PAGE_LABELS.MEMO_LABEL}</div>
              <div className="text-sm leading-relaxed">{voucher.memo}</div>
            </div>
          )}

          {/* 分錄明細 */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground w-16">
                    項次
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground w-24">
                    科目代號
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground w-40">
                    科目名稱
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">
                    摘要
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground w-32">
                    借方
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground w-32">
                    貸方
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                      載入中...
                    </td>
                  </tr>
                ) : lines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                      無分錄資料
                    </td>
                  </tr>
                ) : (
                  <>
                    {lines.map(line => (
                      <tr key={line.id} className="border-t hover:bg-muted/30">
                        <td className="px-3 py-3 text-sm text-center">{line.line_no}</td>
                        <td className="px-3 py-3 font-mono text-sm">{line.account?.code || '-'}</td>
                        <td className="px-3 py-3 text-sm font-medium">
                          {line.account?.name || '-'}
                        </td>
                        <td className="px-3 py-3 text-sm text-muted-foreground">
                          <div className="line-clamp-2" title={line.description || '-'}>
                            {line.description || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-sm tabular-nums">
                          {line.debit_amount > 0 ? line.debit_amount.toLocaleString() : '-'}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-sm tabular-nums">
                          {line.credit_amount > 0 ? line.credit_amount.toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                    {/* 合計 */}
                    <tr className="border-t-2 bg-muted/50">
                      <td colSpan={4} className="px-3 py-3 text-right font-semibold text-sm">
                        合計
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-semibold text-sm tabular-nums">
                        {voucher.total_debit.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-semibold text-sm tabular-nums">
                        {voucher.total_credit.toLocaleString()}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
