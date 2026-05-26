'use client'
/**
 * OrderMembersToolbar — 團員名單區塊的標題列 + 工具按鈕
 *
 * 從 OrderMembersExpandable 拆出，只負責頂部操作列的 JSX。
 * 業務邏輯全部由 props 傳入，此組件不持有 state。
 */

import React from 'react'
import { Plus, Printer, Coins, Settings, Edit, Plane, Receipt, Users, FileText } from 'lucide-react'
import { prompt } from '@/lib/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { updateTour } from '@/data'
import { useTranslations } from 'next-intl'
import type { ColumnVisibility } from './OrderMembersExpandable.types'
import { columnLabels } from './OrderMembersExpandable.types'
import type { CustomCostField } from '../_types/order-member.types'
import { CONTRACT_LABELS } from '@/app/(main)/orders/_contracts/constants/labels'

interface OrderMembersToolbarProps {
  mode: 'order' | 'tour'
  embedded: boolean
  memberCount: number
  isAllEditMode: boolean
  onToggleEditMode: () => void
  effectiveOrderId: string | undefined
  tourId: string | null | undefined
  customCostFields: CustomCostField[]
  setCustomCostFields: React.Dispatch<React.SetStateAction<CustomCostField[]>>
  onOpenPnrDialog: () => void
  onOpenInvoiceDialog: () => void
  /** 合約批次 dialog 入口；undefined = 無權限 / 租戶沒開通、不渲染按鈕（仿帳單守門）2026-05-26 */
  onOpenContractDialog?: () => void
  onOpenExportDialog: () => void
  onOpenBatchMatch: () => void
  onAddMember: () => void
  columnVisibility: ColumnVisibility
  onToggleColumnVisibility: (column: keyof ColumnVisibility) => void
  showRoomColumn: boolean
  showVehicleColumn: boolean
}

export function OrderMembersToolbar({
  mode,
  embedded,
  memberCount,
  isAllEditMode,
  onToggleEditMode,
  effectiveOrderId,
  tourId,
  customCostFields,
  setCustomCostFields,
  onOpenPnrDialog,
  onOpenInvoiceDialog,
  onOpenContractDialog,
  onOpenExportDialog,
  onOpenBatchMatch,
  onAddMember,
  columnVisibility,
  onToggleColumnVisibility,
  showRoomColumn,
  showVehicleColumn,
}: OrderMembersToolbarProps) {
  const t = useTranslations('orders')
  return (
    <div
      className={`flex-shrink-0 flex items-center justify-between px-4 py-2 ${embedded ? 'bg-morandi-gold-header border-b border-morandi-gold/20' : 'bg-morandi-gold-header border-b border-border/60'}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-morandi-primary">{t('memberList')}</span>
        <span className="text-sm text-morandi-secondary">
          ({memberCount} {t('personUnit')})
        </span>
      </div>
      <div className="flex items-center gap-1">
        {/* PNR 配對按鈕：tour / order 兩種模式都顯示
            PnrMatchDialog 接的 members 跟著當前 expandable 走、訂單模式下也能用 */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-morandi-secondary"
          onClick={onOpenPnrDialog}
        >
          <Plane size={12} className="mr-1" />
          {t('pnrMatch')}
        </Button>
        {/* 比對顧客：挑「有護照或身分證、還沒連顧客」的團員批次比對既有顧客（2026-05-26 新增、防空白重複卡） */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1 text-xs text-morandi-secondary"
          onClick={onOpenBatchMatch}
          title={t('batchMatchTooltip')}
        >
          <Users size={12} />
          {t('batchMatchButton')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 px-2 gap-1 text-xs ${isAllEditMode ? 'bg-morandi-gold/10 text-morandi-gold' : 'text-morandi-secondary'}`}
          onClick={onToggleEditMode}
          title={isAllEditMode ? t('closeAllEditMode') : t('openAllEditMode')}
        >
          <Edit size={12} />
          {isAllEditMode ? t('closeEdit') : t('editAll')}
        </Button>
        {/* 「新增費用欄位」屬於訂單成員的 per-order 動作、由 order mode 提供（非 tour 全域） */}
        {mode === 'order' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-morandi-secondary"
            onClick={async () => {
              const name = await prompt(t('addCostFieldPlaceholder'), {
                title: t('addCostField'),
                placeholder: t('costFieldExample'),
              })
              if (name?.trim()) {
                const newField = { id: `cost_${Date.now()}`, name: name.trim(), values: {} }
                const updated = [...customCostFields, newField]
                setCustomCostFields(updated)
                // 存到 DB（custom_cost_fields 仍寫到 tour 表、跨 order 共用）
                // 5/24：改走 updateTour entity hook（自動失效快取、不散刻直接寫）
                if (tourId) {
                  const fieldDefs = updated.map(f => ({ id: f.id, name: f.name }))
                  await updateTour(tourId, { custom_cost_fields: fieldDefs } as Parameters<
                    typeof updateTour
                  >[1])
                }
              }
            }}
          >
            <Coins size={12} />
          </Button>
        )}
        {/* 帳單按鈕（William 2026-05-14、訂單模式才顯示）*/}
        {mode === 'order' && effectiveOrderId && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1 text-xs text-morandi-secondary"
            onClick={onOpenInvoiceDialog}
            title="為團員開帳單、產生客戶自助付款 link"
          >
            <Receipt size={12} />
            帳單
          </Button>
        )}
        {/* 合約按鈕（William 2026-05-26、批次勾選流程、跟帳單並排）
            守門同帳單：onOpenContractDialog 為 undefined（無 capability / 租戶沒開通）時不渲染 */}
        {mode === 'order' && effectiveOrderId && onOpenContractDialog && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1 text-xs text-morandi-secondary"
            onClick={onOpenContractDialog}
            title={CONTRACT_LABELS.TOOLBAR_BUTTON_TITLE}
          >
            <FileText size={12} />
            {CONTRACT_LABELS.TOOLBAR_BUTTON}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1 text-xs text-morandi-secondary"
          onClick={onOpenExportDialog}
        >
          <Printer size={12} />
          {t('print')}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1 text-xs text-morandi-secondary"
            >
              <Settings size={12} />
              {t('settings')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 max-h-[70vh] overflow-y-auto">
            <DropdownMenuLabel className="text-xs">{t('showColumns')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={columnVisibility.passport_name}
              onCheckedChange={() => onToggleColumnVisibility('passport_name')}
            >
              {columnLabels.passport_name}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.birth_date}
              onCheckedChange={() => onToggleColumnVisibility('birth_date')}
            >
              {columnLabels.birth_date}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.gender}
              onCheckedChange={() => onToggleColumnVisibility('gender')}
            >
              {columnLabels.gender}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.id_number}
              onCheckedChange={() => onToggleColumnVisibility('id_number')}
            >
              {columnLabels.id_number}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={columnVisibility.passport_number}
              onCheckedChange={() => onToggleColumnVisibility('passport_number')}
            >
              {columnLabels.passport_number}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.passport_expiry}
              onCheckedChange={() => onToggleColumnVisibility('passport_expiry')}
            >
              {columnLabels.passport_expiry}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={columnVisibility.special_meal}
              onCheckedChange={() => onToggleColumnVisibility('special_meal')}
            >
              {columnLabels.special_meal}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.total_payable}
              onCheckedChange={() => onToggleColumnVisibility('total_payable')}
            >
              {columnLabels.total_payable}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.deposit_amount}
              onCheckedChange={() => onToggleColumnVisibility('deposit_amount')}
            >
              {columnLabels.deposit_amount}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.balance}
              onCheckedChange={() => onToggleColumnVisibility('balance')}
            >
              {columnLabels.balance}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.remarks}
              onCheckedChange={() => onToggleColumnVisibility('remarks')}
            >
              {columnLabels.remarks}
            </DropdownMenuCheckboxItem>
            {/* PNR 欄位:tour / order 兩種模式都顯示(支援訂單級 PNR 配對) */}
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={columnVisibility.pnr}
              onCheckedChange={() => onToggleColumnVisibility('pnr')}
            >
              {columnLabels.pnr}
            </DropdownMenuCheckboxItem>
            {mode === 'tour' && (
              <>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.ticket_number}
                  onCheckedChange={() => onToggleColumnVisibility('ticket_number')}
                >
                  {columnLabels.ticket_number}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.ticketing_deadline}
                  onCheckedChange={() => onToggleColumnVisibility('ticketing_deadline')}
                >
                  {columnLabels.ticketing_deadline}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.flight_cost}
                  onCheckedChange={() => onToggleColumnVisibility('flight_cost')}
                >
                  {columnLabels.flight_cost}
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.room && showRoomColumn}
                  onCheckedChange={() => showRoomColumn && onToggleColumnVisibility('room')}
                  className={!showRoomColumn ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  {columnLabels.room} {!showRoomColumn && t('noData')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.vehicle && showVehicleColumn}
                  onCheckedChange={() => showVehicleColumn && onToggleColumnVisibility('vehicle')}
                  className={!showVehicleColumn ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  {columnLabels.vehicle} {!showVehicleColumn && t('noData')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.surcharges}
                  onCheckedChange={() => onToggleColumnVisibility('surcharges')}
                >
                  {columnLabels.surcharges}
                </DropdownMenuCheckboxItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {/* 只在訂單模式下顯示「新增」按鈕、團體模式下應該在訂單詳細頁面新增 */}
        {mode === 'order' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1 text-xs text-morandi-secondary"
            onClick={onAddMember}
          >
            <Plus size={12} />
            {t('add')}
          </Button>
        )}
      </div>
    </div>
  )
}
