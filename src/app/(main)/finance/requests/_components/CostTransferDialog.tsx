'use client'

import { useState, useMemo } from 'react'
import { FormDialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { ArrowRightLeft, X} from 'lucide-react'

const COMPONENT_LABELS = {
  PH_SEARCH_TOUR: '搜尋團號或團名...',
  SELECT_TRANSFER_ITEMS: '選擇轉移項目',
  TITLE: '成本轉移',
  FROM: '從',
  TRANSFER_TO_OTHER_TOUR: '轉移至其他團',
  TARGET_TOUR: '目標團',
  TOUR_NOT_FOUND: '找不到團',
  SELECTED_PREFIX: '已選',
  SELECTED_SUFFIX: '筆，共',
  CANCEL: '取消',
  CONFIRM_TRANSFER: '確認轉移',
} as const
import { useToursSlim, invalidatePaymentRequests, invalidatePaymentRequestItems } from '@/data'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/format-currency'
import { useRequestOperations } from '../_hooks/useRequestOperations'
import { useWorkspaceId } from '@/lib/workspace-context'

import { Spinner } from '@/components/ui/spinner'
interface CostTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 來源請款單資訊 */
  sourceRequest: {
    id: string
    code: string
    tourId: string
    tourCode: string
    tourName: string
    amount: number
    items: Array<{
      id: string
      description: string
      subtotal: number
      supplier_name?: string
    }>
  } | null
  onSuccess?: () => void
}

export function CostTransferDialog({
  open,
  onOpenChange,
  sourceRequest,
  onSuccess,
}: CostTransferDialogProps) {
  const { items: tours } = useToursSlim({ all: true })
  const { user } = useAuthStore()
  const workspaceId = useWorkspaceId()
  const { generateRequestCodeAsync } = useRequestOperations()
  const [targetTourId, setTargetTourId] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [transferring, setTransferring] = useState(false)

  // 排除來源團的選項
  const tourOptions = useMemo(() => {
    return tours
      .filter(t => {
        if (t.id === sourceRequest?.tourId) return false
        if (t.archived) return false
        // 排除已結案團
        const status = (t as unknown as { status?: string }).status
        if (status === '已結案' || status === 'closed') return false
        return true
      })
      .map(t => ({
        value: t.id,
        label: `${t.code || ''} - ${t.name || ''}`,
      }))
  }, [tours, sourceRequest?.tourId])

  // 選中的總金額
  const selectedTotal = useMemo(() => {
    if (!sourceRequest) return 0
    return sourceRequest.items
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => sum + (item.subtotal || 0), 0)
  }, [sourceRequest, selectedItems])

  // 全選/取消全選
  const toggleAll = () => {
    if (!sourceRequest) return
    if (selectedItems.size === sourceRequest.items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(sourceRequest.items.map(i => i.id)))
    }
  }

  // 執行轉移（對沖模式）：
  //   不改既有 item、改成建兩張新請款單：
  //     R_src：tour = 來源團、amount = -X、items 複製原 items 且金額取負
  //     R_dst：tour = 目標團、amount = +X、items 複製原 items 且金額為正
  //   兩張共用 transferred_pair_id、走正常 pending → 出納 → 正式 flow
  const handleTransfer = async () => {
    if (!sourceRequest || selectedItems.size === 0 || !targetTourId) return
    if (!workspaceId) {
      toast.error('轉移失敗', { description: '找不到 workspace' })
      return
    }

    const targetTour = tours.find(t => t.id === targetTourId) as
      | { id: string; code?: string | null; name?: string | null }
      | undefined
    if (!targetTour) return

    setTransferring(true)
    try {
      // 1. 抓所選 items 完整欄位
      const itemIds = Array.from(selectedItems)
      const { data: fullItems, error: fetchErr } = await supabase
        .from('payment_request_items')
        .select(
          'id, category, supplier_id, supplier_name, description, unit_price, quantity, subtotal, payment_method_id'
        )
        .in('id', itemIds)
      if (fetchErr || !fullItems) throw fetchErr || new Error('讀取 items 失敗')

      const totalAmount = fullItems.reduce(
        (s, i) => s + ((i as { subtotal?: number }).subtotal || 0),
        0
      )
      const pairId = crypto.randomUUID()
      const today = new Date().toISOString().split('T')[0]
      const srcCode = await generateRequestCodeAsync(sourceRequest.tourCode)

      // 2. 建 R_src（來源團、負金額）
      const srcPayload = {
        code: srcCode,
        request_number: srcCode,
        workspace_id: workspaceId,
        tour_id: sourceRequest.tourId,
        tour_code: sourceRequest.tourCode,
        tour_name: sourceRequest.tourName,
        request_category: 'tour',
        request_type: '成本轉移',
        request_date: today,
        amount: -totalAmount,
        total_amount: -totalAmount,
        status: 'pending',
        transferred_pair_id: pairId,
        notes: `成本轉移至 ${targetTour.code || ''}`,
        created_by: user?.id || null,
      }
      const { data: srcRequest, error: srcErr } = await supabase
        .from('payment_requests')
        .insert(srcPayload as never)
        .select('id, code')
        .single()
      if (srcErr || !srcRequest) throw srcErr || new Error('建來源端請款單失敗')

      // 3. 插入 R_src 的負向 items
      const srcItems = fullItems.map((it, idx) => {
        const i = it as {
          category?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          description?: string | null
          unit_price?: number | null
          quantity?: number | null
          subtotal?: number | null
          payment_method_id?: string | null
        }
        return {
          request_id: (srcRequest as { id: string }).id,
          workspace_id: workspaceId,
          item_number: `${(srcRequest as { code: string }).code}-${idx + 1}`,
          category: i.category || null,
          supplier_id: i.supplier_id || null,
          supplier_name: i.supplier_name || null,
          description: i.description || null,
          unit_price: -(i.unit_price || 0),
          quantity: i.quantity || 1,
          subtotal: -(i.subtotal || 0),
          payment_method_id: i.payment_method_id || null,
          sort_order: idx + 1,
          // 審計欄：誰、什麼時候、從哪個團轉出來
          transferred_at: new Date().toISOString(),
          transferred_by: user?.id || null,
          transferred_from_tour_id: sourceRequest.tourId,
        }
      })
      const { error: srcItemsErr } = await supabase
        .from('payment_request_items')
        .insert(srcItems as never)
      if (srcItemsErr) {
        await supabase
          .from('payment_requests')
          .delete()
          .eq('id', (srcRequest as { id: string }).id)
        throw srcItemsErr
      }

      // 4. 建 R_dst（目標團、正金額）
      const dstCode = await generateRequestCodeAsync(targetTour.code || '')
      const dstPayload = {
        code: dstCode,
        request_number: dstCode,
        workspace_id: workspaceId,
        tour_id: targetTour.id,
        tour_code: targetTour.code || '',
        tour_name: targetTour.name || '',
        request_category: 'tour',
        request_type: '成本轉移',
        request_date: today,
        amount: totalAmount,
        total_amount: totalAmount,
        status: 'pending',
        transferred_pair_id: pairId,
        notes: `從 ${sourceRequest.tourCode} 轉入`,
        created_by: user?.id || null,
      }
      const { data: dstRequest, error: dstErr } = await supabase
        .from('payment_requests')
        .insert(dstPayload as never)
        .select('id, code')
        .single()
      if (dstErr || !dstRequest) {
        // rollback R_src 全部
        await supabase
          .from('payment_request_items')
          .delete()
          .eq('request_id', (srcRequest as { id: string }).id)
        await supabase
          .from('payment_requests')
          .delete()
          .eq('id', (srcRequest as { id: string }).id)
        throw dstErr || new Error('建目標端請款單失敗')
      }

      // 5. 插入 R_dst 的正向 items
      const dstItems = fullItems.map((it, idx) => {
        const i = it as {
          category?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          description?: string | null
          unit_price?: number | null
          quantity?: number | null
          subtotal?: number | null
          payment_method_id?: string | null
        }
        return {
          request_id: (dstRequest as { id: string }).id,
          workspace_id: workspaceId,
          item_number: `${(dstRequest as { code: string }).code}-${idx + 1}`,
          category: i.category || null,
          supplier_id: i.supplier_id || null,
          supplier_name: i.supplier_name || null,
          description: i.description || null,
          unit_price: i.unit_price || 0,
          quantity: i.quantity || 1,
          subtotal: i.subtotal || 0,
          payment_method_id: i.payment_method_id || null,
          sort_order: idx + 1,
          // 審計欄：誰、什麼時候、從哪個團轉進來
          transferred_at: new Date().toISOString(),
          transferred_by: user?.id || null,
          transferred_from_tour_id: sourceRequest.tourId,
        }
      })
      const { error: dstItemsErr } = await supabase
        .from('payment_request_items')
        .insert(dstItems as never)
      if (dstItemsErr) {
        // rollback 全部
        await supabase
          .from('payment_request_items')
          .delete()
          .eq('request_id', (srcRequest as { id: string }).id)
        await supabase
          .from('payment_requests')
          .delete()
          .eq('id', (srcRequest as { id: string }).id)
        await supabase
          .from('payment_requests')
          .delete()
          .eq('id', (dstRequest as { id: string }).id)
        throw dstItemsErr
      }

      // 6. 成功
      await Promise.all([invalidatePaymentRequests(), invalidatePaymentRequestItems()])
      toast.success('成本轉移成功', {
        description: `已建立 2 張對沖請款單：${sourceRequest.tourCode} -${formatCurrency(
          totalAmount
        )} / ${targetTour.code} +${formatCurrency(totalAmount)}`,
      })

      setTargetTourId('')
      setSelectedItems(new Set())
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      logger.error('成本轉移失敗:', error)
      toast.error('轉移失敗', {
        description: (error as Error)?.message || '請稍後再試',
      })
    } finally {
      setTransferring(false)
    }
  }

  // Dialog 開啟時預設全選
  const handleOpenChange = (open: boolean) => {
    if (open && sourceRequest) {
      setSelectedItems(new Set(sourceRequest.items.map(i => i.id)))
      setTargetTourId('')
    }
    onOpenChange(open)
  }

  if (!sourceRequest) return null

  const customFooter = (
    <div className="flex items-center justify-between w-full">
      <div className="text-sm text-morandi-secondary">
        {COMPONENT_LABELS.SELECTED_PREFIX} {selectedItems.size} {COMPONENT_LABELS.SELECTED_SUFFIX}{' '}
        <span className="font-semibold text-morandi-primary">
          {formatCurrency(selectedTotal)}
        </span>
      </div>
      <div className="flex gap-2">
        <Button variant="soft-gold" onClick={() => onOpenChange(false)}>
          <X className="h-4 w-4" />
          {COMPONENT_LABELS.CANCEL}
        </Button>
        <Button
          variant="soft-gold"
          onClick={handleTransfer}
          disabled={transferring || selectedItems.size === 0 || !targetTourId}
          className="gap-2"
        >
          {transferring ? (
            <Spinner size="sm" />
          ) : (
            <ArrowRightLeft size={14} />
          )}
          {COMPONENT_LABELS.CONFIRM_TRANSFER}
        </Button>
      </div>
    </div>
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <span className="flex items-center gap-2">
          <ArrowRightLeft size={18} />
          {COMPONENT_LABELS.TITLE}
        </span>
      }
      onSubmit={handleTransfer}
      submitDisabled={transferring || selectedItems.size === 0 || !targetTourId}
      loading={transferring}
      footer={customFooter}
      level={3}
      maxWidth="lg"
    >
      {/* 來源資訊 */}
      <div className="text-sm text-morandi-secondary mb-2">
        {COMPONENT_LABELS.FROM} <span className="font-medium text-morandi-primary">{sourceRequest.tourCode}</span>{' '}
        {sourceRequest.tourName} {COMPONENT_LABELS.TRANSFER_TO_OTHER_TOUR}
      </div>

      {/* 選擇目標團 */}
      <div className="mb-4">
        <label className="text-sm font-medium text-morandi-primary mb-1 block">
          {COMPONENT_LABELS.TARGET_TOUR} <span className="text-morandi-red">*</span>
        </label>
        <Combobox
          options={tourOptions}
          value={targetTourId}
          onChange={setTargetTourId}
          placeholder={COMPONENT_LABELS.PH_SEARCH_TOUR}
          emptyMessage={COMPONENT_LABELS.TOUR_NOT_FOUND}
          className="w-full"
          maxHeight="200px"
        />
      </div>

      {/* 項目列表 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-morandi-primary">{COMPONENT_LABELS.SELECT_TRANSFER_ITEMS}</label>
          <Button
            type="button"
            variant="link"
            size="xs"
            onClick={toggleAll}
            className="text-xs text-morandi-gold hover:text-morandi-gold-hover h-auto px-0"
          >
            {selectedItems.size === sourceRequest.items.length ? '取消全選' : '全選'}
          </Button>
        </div>
        <div className="border border-border rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
          {sourceRequest.items.map(item => (
            <label
              key={item.id}
              className="flex items-center gap-3 px-3 py-2 hover:bg-morandi-gold/5 cursor-pointer border-b border-border/30 last:border-b-0"
            >
              <input
                type="checkbox"
                checked={selectedItems.has(item.id)}
                onChange={() => {
                  setSelectedItems(prev => {
                    const next = new Set(prev)
                    if (next.has(item.id)) next.delete(item.id)
                    else next.add(item.id)
                    return next
                  })
                }}
                className="rounded border-morandi-secondary w-4 h-4"
              />
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="text-xs truncate">
                  {item.supplier_name && (
                    <span className="text-morandi-secondary mr-1">{item.supplier_name}</span>
                  )}
                  <span className="text-morandi-primary">{item.description}</span>
                </div>
              </div>
              <span className="text-sm font-medium text-morandi-primary shrink-0">
                {formatCurrency(item.subtotal)}
              </span>
            </label>
          ))}
        </div>
      </div>
    </FormDialog>
  )
}
