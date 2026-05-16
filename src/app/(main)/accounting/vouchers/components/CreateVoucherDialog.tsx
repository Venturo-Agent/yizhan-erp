'use client'

import { useState, useEffect } from 'react'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { FormDialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

const PAGE_LABELS = {
  ADD_VOUCHER_TITLE: '新增傳票',
  MEMO_LABEL: '說明',
  MEMO_PLACEHOLDER: '傳票說明',
  NO_LINK_PLACEHOLDER: '不關聯單據',
  NO_LINK: '不關聯單據',
  RECEIPT: '收款單',
  PAYMENT_REQUEST: '請款單',
  SELECT_DOCUMENT: '選擇單據',
  NO_AVAILABLE_DOCUMENTS: '沒有可選的單據',
  ENTRY_DETAILS: '分錄明細',
  COL_ACCOUNT: '科目',
  COL_SUMMARY: '摘要',
  COL_DEBIT: '借方',
  COL_CREDIT: '貸方',
  COL_ACTION: '操作',
  SELECT_ACCOUNT_PLACEHOLDER: '選擇科目',
  SUMMARY_PLACEHOLDER: '摘要',
  LOAD_ACCOUNTS_FAILED: '載入科目表失敗',
  MIN_LINES: '至少需要兩筆分錄',
  REQUIRED_DATE: '請選擇傳票日期',
  REQUIRED_ACCOUNTS: '請為所有分錄選擇科目',
  UNBALANCED: '借貸不平衡！借方總額必須等於貸方總額',
  CREATE_FAILED: '建立傳票失敗',
  CREATE_SUCCESS: '傳票建立成功',
  FIELD_VOUCHER_DATE: '傳票日期 *',
  FIELD_LINK_DOC_TYPE: '關聯單據類型（選填）',
  LOADING: '載入中...',
  PLEASE_SELECT_TYPE_FIRST: '請先選擇類型',
  ADD_LINE: '新增分錄',
  TOTAL: '總計',
  BALANCED: '✅ 平衡',
  UNBALANCED_BADGE: '❌ 不平衡',
} as const

interface JournalLine {
  id: string
  account_id: string
  account_code?: string
  account_name?: string
  description: string
  debit_amount: number
  credit_amount: number
}

interface Account {
  id: string
  code: string
  name: string
  account_type: string
}

interface CreateVoucherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// 關聯單據類型
type SourceType = '' | 'receipt' | 'payment_request'

interface SourceDocument {
  id: string
  code: string
  description: string
  amount: number
  date: string
}

export function CreateVoucherDialog({ open, onOpenChange, onSuccess }: CreateVoucherDialogProps) {
  const { user } = useAuthStore()
  const [accounts, setAccounts] = useState<Account[]>([])

  // 傳票資料
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0])
  const [memo, setMemo] = useState('')

  // 關聯單據
  const [sourceType, setSourceType] = useState<SourceType>('')
  const [sourceId, setSourceId] = useState('')
  const [sourceDocuments, setSourceDocuments] = useState<SourceDocument[]>([])
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)

  // 分錄明細
  const [lines, setLines] = useState<JournalLine[]>([
    { id: '1', account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
    { id: '2', account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
  ])

  // 載入科目表
  useEffect(() => {
    if (open && user?.workspace_id) {
      loadAccounts()
    }
  }, [open, user?.workspace_id])

  // 載入關聯單據列表
  useEffect(() => {
    if (sourceType && user?.workspace_id) {
      loadSourceDocuments()
    } else {
      setSourceDocuments([])
      setSourceId('')
    }
  }, [sourceType, user?.workspace_id])

  const loadSourceDocuments = async () => {
    if (!user?.workspace_id || !sourceType) return

    setIsLoadingDocuments(true)
    try {
      if (sourceType === 'receipt') {
        // 載入收款單（排除已有傳票的）
        const { data } = await supabase
          .from('receipts')
          .select('id, receipt_number, notes, receipt_amount, receipt_date')
          .eq('workspace_id', user.workspace_id)
          .order('receipt_date', { ascending: false })
          .limit(50)

        setSourceDocuments(
          (data || []).map(r => ({
            id: r.id,
            code: r.receipt_number || r.id.slice(0, 8),
            description: r.notes || '收款單',
            amount: r.receipt_amount || 0,
            date: r.receipt_date || '',
          }))
        )
      } else if (sourceType === 'payment_request') {
        // 載入請款單
        const { data } = await supabase
          .from('payment_requests')
          .select('id, code, notes, total_amount, request_date')
          .eq('workspace_id', user.workspace_id)
          .order('request_date', { ascending: false })
          .limit(50)

        setSourceDocuments(
          (data || []).map(r => ({
            id: r.id,
            code: r.code || r.id.slice(0, 8),
            description: r.notes || '請款單',
            amount: r.total_amount || 0,
            date: r.request_date || '',
          }))
        )
      }
    } catch (error) {
      logger.error('載入單據失敗:', error)
    } finally {
      setIsLoadingDocuments(false)
    }
  }

  const loadAccounts = async () => {
    if (!user?.workspace_id) return

    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('id, code, name, account_type')
        .eq('workspace_id', user.workspace_id)
        .eq('is_active', true)
        .order('code', { ascending: true })

      if (error) throw error
      setAccounts(data || [])
    } catch (error) {
      logger.error('載入科目表失敗:', error)
      toast.error(PAGE_LABELS.LOAD_ACCOUNTS_FAILED)
    }
  }

  // 新增分錄
  const addLine = () => {
    setLines([
      ...lines,
      {
        id: Date.now().toString(),
        account_id: '',
        description: '',
        debit_amount: 0,
        credit_amount: 0,
      },
    ])
  }

  // 刪除分錄
  const removeLine = (id: string) => {
    if (lines.length <= 2) {
      toast.error(PAGE_LABELS.MIN_LINES)
      return
    }
    setLines(lines.filter(line => line.id !== id))
  }

  // 更新分錄
  const updateLine = (id: string, field: keyof JournalLine, value: string | number) => {
    setLines(lines.map(line => (line.id === id ? { ...line, [field]: value } : line)))
  }

  // 計算總額
  const totalDebit = lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0)
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0)
  const isBalanced = totalDebit === totalCredit && totalDebit > 0

  // 提交傳票
  const { isSubmitting: isLoading, execute: handleSubmit } = useAsyncSubmit(
    async () => {
      // 驗證
      if (!voucherDate) {
        toast.error(PAGE_LABELS.REQUIRED_DATE)
        return
      }

      if (lines.some(line => !line.account_id)) {
        toast.error(PAGE_LABELS.REQUIRED_ACCOUNTS)
        return
      }

      if (!isBalanced) {
        toast.error(PAGE_LABELS.UNBALANCED)
        return
      }

      const response = await fetch('/api/accounting/vouchers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucher_date: voucherDate,
          source_type: sourceType || null,
          source_id: sourceId || null,
          memo: memo.trim() || null,
          lines: lines.map(line => ({
            account_id: line.account_id,
            description: line.description.trim() || null,
            debit_amount: line.debit_amount || 0,
            credit_amount: line.credit_amount || 0,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || PAGE_LABELS.CREATE_FAILED)
      }

      toast.success(PAGE_LABELS.CREATE_SUCCESS)
      onSuccess?.()
      handleClose()
    },
    {
      onError: (error) => {
        logger.error('建立傳票失敗:', error)
        toast.error(error instanceof Error ? error.message : PAGE_LABELS.CREATE_FAILED)
      },
    }
  )

  const handleClose = () => {
    setVoucherDate(new Date().toISOString().split('T')[0])
    setMemo('')
    setSourceType('')
    setSourceId('')
    setSourceDocuments([])
    setLines([
      { id: '1', account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
      { id: '2', account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
    ])
    onOpenChange(false)
  }

  const customFooter = (
    <div className="flex justify-end gap-2">
      <Button variant="soft-gold" onClick={handleClose}>
        <X className="h-4 w-4 mr-1" />
        取消
      </Button>
      <Button onClick={handleSubmit} disabled={isLoading || !isBalanced}>
        {isLoading ? '建立中...' : '建立傳票'}
      </Button>
    </div>
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={PAGE_LABELS.ADD_VOUCHER_TITLE}
      onSubmit={handleSubmit}
      loading={isLoading}
      submitDisabled={!isBalanced}
      footer={customFooter}
      maxWidth="5xl"
      contentClassName="max-h-[90vh] overflow-y-auto"
    >
        <div className="space-y-4">
          {/* 傳票資訊 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{PAGE_LABELS.FIELD_VOUCHER_DATE}</Label>
              <DatePicker value={voucherDate} onChange={setVoucherDate} />
            </div>
            <div>
              <Label>{PAGE_LABELS.MEMO_LABEL}</Label>
              <Input placeholder={PAGE_LABELS.MEMO_PLACEHOLDER} value={memo} onChange={e => setMemo(e.target.value)} />
            </div>
          </div>

          {/* 關聯單據 */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
            <div>
              <Label>{PAGE_LABELS.FIELD_LINK_DOC_TYPE}</Label>
              <Select
                value={sourceType || 'none'}
                onValueChange={v => setSourceType(v === 'none' ? '' : (v as SourceType))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={PAGE_LABELS.NO_LINK_PLACEHOLDER} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{PAGE_LABELS.NO_LINK}</SelectItem>
                  <SelectItem value="receipt">{PAGE_LABELS.RECEIPT}</SelectItem>
                  <SelectItem value="payment_request">{PAGE_LABELS.PAYMENT_REQUEST}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{PAGE_LABELS.SELECT_DOCUMENT}</Label>
              <Select
                value={sourceId}
                onValueChange={setSourceId}
                disabled={!sourceType || isLoadingDocuments}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingDocuments ? PAGE_LABELS.LOADING : PAGE_LABELS.PLEASE_SELECT_TYPE_FIRST} />
                </SelectTrigger>
                <SelectContent>
                  {sourceDocuments.map(doc => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.code} - {doc.description} (${doc.amount.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sourceType && sourceDocuments.length === 0 && !isLoadingDocuments && (
                <p className="text-xs text-muted-foreground mt-1">{PAGE_LABELS.NO_AVAILABLE_DOCUMENTS}</p>
              )}
            </div>
          </div>

          {/* 分錄明細 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>{PAGE_LABELS.ENTRY_DETAILS}</Label>
              <Button type="button" variant="soft-gold" size="sm" onClick={addLine}>
                <Plus size={14} className="mr-1" />
                {PAGE_LABELS.ADD_LINE}
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2 w-[25%]">{PAGE_LABELS.COL_ACCOUNT}</th>
                    <th className="text-left p-2 w-[30%]">{PAGE_LABELS.COL_SUMMARY}</th>
                    <th className="text-right p-2 w-[18%]">{PAGE_LABELS.COL_DEBIT}</th>
                    <th className="text-right p-2 w-[18%]">{PAGE_LABELS.COL_CREDIT}</th>
                    <th className="text-center p-2 w-[9%]">{PAGE_LABELS.COL_ACTION}</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map(line => (
                    <tr key={line.id} className="border-t">
                      <td className="p-2">
                        <Select
                          value={line.account_id}
                          onValueChange={value => updateLine(line.id, 'account_id', value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder={PAGE_LABELS.SELECT_ACCOUNT_PLACEHOLDER} />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map(account => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.code} - {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          className="h-8"
                          placeholder={PAGE_LABELS.SUMMARY_PLACEHOLDER}
                          value={line.description}
                          onChange={e => updateLine(line.id, 'description', e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          className="h-8 text-right"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.debit_amount || ''}
                          onChange={e =>
                            updateLine(line.id, 'debit_amount', parseFloat(e.target.value) || 0)
                          }
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          className="h-8 text-right"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.credit_amount || ''}
                          onChange={e =>
                            updateLine(line.id, 'credit_amount', parseFloat(e.target.value) || 0)
                          }
                        />
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLine(line.id)}
                          disabled={lines.length <= 2}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {/* 總計行 */}
                  <tr className="border-t bg-muted font-semibold">
                    <td colSpan={2} className="p-2 text-right">
                      總計
                    </td>
                    <td className="p-2 text-right">{totalDebit.toLocaleString()}</td>
                    <td className="p-2 text-right">{totalCredit.toLocaleString()}</td>
                    <td className="p-2 text-center">
                      {isBalanced ? (
                        <span className="text-morandi-green">✅ 平衡</span>
                      ) : (
                        <span className="text-morandi-red">❌ 不平衡</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
    </FormDialog>
  )
}
