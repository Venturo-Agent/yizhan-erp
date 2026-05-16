// 收款方式 / 付款方式 section
// 包：list table + drag-sort + MethodDialog + 所有 mutation handler
// 從 page.tsx 抽出、邏輯不變、加防連點

'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { alert, confirm } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { COMMON_MESSAGES } from '@/constants/messages'
import { useTranslations } from 'next-intl'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './shared-table'
import {
  PAGE_LABELS,
  type PaymentMethod,
  type ChartOfAccount,
} from './types'
import { SortableMethodRow } from './SortableMethodRow'
import { MethodDialog } from './MethodDialog'

interface PaymentMethodsSectionProps {
  type: 'receipt' | 'payment'
  paymentMethods: PaymentMethod[]
  chartOfAccounts: ChartOfAccount[]
  workspaceId: string | undefined
  reload: () => Promise<void>
  setPaymentMethods: React.Dispatch<React.SetStateAction<PaymentMethod[]>>
  // dialog control 由 parent 持有、好讓 primaryAction 「新增」按鈕可開
  isDialogOpen: boolean
  setIsDialogOpen: (open: boolean) => void
  editingMethod: PaymentMethod | null
  setEditingMethod: (m: PaymentMethod | null) => void
}

export function PaymentMethodsSection({
  type,
  paymentMethods,
  chartOfAccounts,
  workspaceId,
  reload,
  setPaymentMethods,
  isDialogOpen,
  setIsDialogOpen,
  editingMethod,
  setEditingMethod,
}: PaymentMethodsSectionProps) {
  const t = useTranslations('finance')
  // 先依 type filter
  const list = paymentMethods.filter(m => m.type === type)

  // 防連點 per-row loading 狀態（key = method.id）
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({})
  const setLoading = (id: string, v: boolean) =>
    setRowLoading(prev => ({ ...prev, [id]: v }))

  // ===== 拖曳排序 =====
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = list.findIndex(m => m.id === active.id)
    const newIndex = list.findIndex(m => m.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(list, oldIndex, newIndex)

    // Optimistic update：local state 先換順序、UI 立即反映
    const reorderedIds = new Set(reordered.map(m => m.id))
    setPaymentMethods(prev => {
      const others = prev.filter(m => !reorderedIds.has(m.id))
      return [...others, ...reordered.map((m, idx) => ({ ...m, sort_order: idx + 1 }))]
    })

    // Batch PUT sort_order
    try {
      await Promise.all(
        reordered.map((m, idx) =>
          fetch('/api/finance/payment-methods', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: m.id, sort_order: idx + 1 }),
          })
        )
      )
    } catch (error) {
      logger.error('排序更新失敗:', error)
      await alert(COMMON_MESSAGES.UPDATE_FAILED, 'error')
      await reload() // 失敗 → reload 還原
    }
  }

  // 儲存付款方式
  const handleSaveMethod = async (method: Partial<PaymentMethod>) => {
    try {
      const res = await fetch('/api/finance/payment-methods', {
        method: editingMethod?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...method,
          id: editingMethod?.id,
          workspace_id: workspaceId,
          type,
        }),
      })
      if (!res.ok) throw new Error('儲存失敗')
      await reload()
      setIsDialogOpen(false)
      setEditingMethod(null)
      await alert(COMMON_MESSAGES.SAVE_SUCCESS, 'success')
    } catch {
      await alert(COMMON_MESSAGES.SAVE_FAILED, 'error')
    }
  }

  // 複製方式（system / 自訂都可複製、複製後變 user 自訂、可改名 / 編輯）
  const handleCopyMethod = async (method: PaymentMethod) => {
    if (rowLoading[method.id]) return
    setLoading(method.id, true)
    try {
      const maxSort = Math.max(
        0,
        ...paymentMethods.filter(m => m.type === method.type).map(m => m.sort_order || 0)
      )
      const res = await fetch('/api/finance/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          type: method.type,
          // code 加 _COPY 後綴避免衝突；user 編輯時可改
          code: `${method.code}_COPY_${Date.now().toString(36).slice(-4).toUpperCase()}`,
          name: `${method.name} - 副本`,
          description: method.description,
          placeholder: method.placeholder,
          debit_account_id: method.debit_account_id,
          credit_account_id: method.credit_account_id,
          fee_percent: method.fee_percent ?? 0,
          fee_fixed: method.fee_fixed ?? 0,
          fee_account_id: method.fee_account_id,
          sort_order: maxSort + 1,
          is_active: true,
          is_system: false, // 副本一律 user 自訂
        }),
      })
      if (!res.ok) throw new Error('複製失敗')
      await reload()
      await alert(t('copySuccessEditName'), 'success')
    } catch {
      await alert(COMMON_MESSAGES.OPERATION_FAILED, 'error')
    } finally {
      setLoading(method.id, false)
    }
  }

  // 切換付款方式啟用/停用
  const handleToggleActive = async (method: PaymentMethod) => {
    if (rowLoading[method.id]) return
    const newStatus = !method.is_active
    const action = newStatus ? '啟用' : '停用'
    const confirmed = await confirm(`確定要${action}「${method.name}」嗎？`, {
      title: `${action}付款方式`,
      type: 'warning',
    })
    if (!confirmed) return

    setLoading(method.id, true)
    try {
      const res = await fetch('/api/finance/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: method.id, is_active: newStatus }),
      })
      if (!res.ok) throw new Error(`${action}失敗`)
      await reload()
      await alert(`${action}成功`, 'success')
    } catch {
      await alert(`${action}失敗`, 'error')
    } finally {
      setLoading(method.id, false)
    }
  }

  // 刪除付款方式（hard delete、被既有交易紀錄引用時回 409）
  const handleDeleteMethod = async (method: PaymentMethod) => {
    if (rowLoading[method.id]) return
    const confirmed = await confirm(`確定要刪除「${method.name}」嗎？此動作無法復原。`, {
      title: '刪除付款方式',
      type: 'warning',
    })
    if (!confirmed) return

    setLoading(method.id, true)
    try {
      const res = await fetch(`/api/finance/payment-methods?id=${method.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        await alert(body.error || COMMON_MESSAGES.DELETE_FAILED, 'error')
        return
      }
      await reload()
      await alert(COMMON_MESSAGES.DELETE_SUCCESS, 'success')
    } catch {
      await alert(COMMON_MESSAGES.DELETE_FAILED, 'error')
    } finally {
      setLoading(method.id, false)
    }
  }

  const emptyText = type === 'receipt' ? '尚未設定收款方式' : '尚未設定付款方式'

  return (
    <>
      <div className="space-y-4">
        <Card className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>{PAGE_LABELS.COL_NAME}</TableHead>
                  <TableHead>{PAGE_LABELS.COL_DESCRIPTION}</TableHead>
                  <TableHead>{PAGE_LABELS.COL_PAYMENT_HINT}</TableHead>
                  <TableHead>{PAGE_LABELS.COL_DEBIT_ACCOUNT}</TableHead>
                  <TableHead>{PAGE_LABELS.COL_CREDIT_ACCOUNT}</TableHead>
                  <TableHead className="w-[80px]">{PAGE_LABELS.COL_STATUS}</TableHead>
                  <TableHead className="w-[80px] text-right">{PAGE_LABELS.COL_ACTION}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-morandi-muted">
                      {emptyText}
                    </TableCell>
                  </TableRow>
                ) : (
                  <SortableContext
                    items={list.map(m => m.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {list.map(method => (
                      <SortableMethodRow
                        key={method.id}
                        method={method}
                        loading={!!rowLoading[method.id]}
                        onEdit={() => {
                          setEditingMethod(method)
                          setIsDialogOpen(true)
                        }}
                        onToggle={() => handleToggleActive(method)}
                        onDelete={() => handleDeleteMethod(method)}
                        onCopy={() => handleCopyMethod(method)}
                      />
                    ))}
                  </SortableContext>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </Card>
      </div>

      <MethodDialog
        open={isDialogOpen}
        onOpenChange={(open: boolean) => {
          setIsDialogOpen(open)
          if (!open) setEditingMethod(null)
        }}
        method={editingMethod}
        type={type}
        onSave={handleSaveMethod}
        chartOfAccounts={chartOfAccounts}
        existingMethods={list}
      />
    </>
  )
}
