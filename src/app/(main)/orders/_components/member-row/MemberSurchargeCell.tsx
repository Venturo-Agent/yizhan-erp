'use client'
/**
 * MemberSurchargeCell - 團員附加費用欄位
 * 顯示和編輯團員的各種附加費用
 */

import React, { useState, useCallback, useMemo } from 'react'
import { Plus, Trash2, Calculator } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ACTION_BUTTON_BASE, ACTION_BUTTON_DEFAULT_TONE } from '@/components/table-cells'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/dialog'
import type { MemberSurcharges, SurchargeItem } from '../../_types/member-surcharge.types'
import { DEFAULT_SURCHARGES, SURCHARGE_LABELS } from '../../_types/member-surcharge.types'
import { useTranslations } from 'next-intl'

interface MemberSurchargeCellProps {
  memberId: string
  memberName: string
  surcharges: MemberSurcharges | null
  baseCost: number | null // 基本團費
  onChange: (memberId: string, surcharges: MemberSurcharges) => void
}

export function MemberSurchargeCell({
  memberId,
  memberName,
  surcharges,
  baseCost,
  onChange,
}: MemberSurchargeCellProps) {
  const t = useTranslations('orders')
  const [showDialog, setShowDialog] = useState(false)
  const [editData, setEditData] = useState<MemberSurcharges>(DEFAULT_SURCHARGES)

  // 解析 surcharges 數據
  const currentSurcharges = useMemo(() => {
    if (!surcharges) return DEFAULT_SURCHARGES
    return {
      single_room_surcharge: surcharges.single_room_surcharge || null,
      add_on_items: Array.isArray(surcharges.add_on_items) ? surcharges.add_on_items : [],
      other_charges: Array.isArray(surcharges.other_charges) ? surcharges.other_charges : [],
    }
  }, [surcharges])

  // 計算附加費用總額
  const totalSurcharge = useMemo(() => {
    const { single_room_surcharge, add_on_items, other_charges } = currentSurcharges

    let total = 0
    if (single_room_surcharge) total += single_room_surcharge

    add_on_items.forEach(item => {
      if (item.amount) total += item.amount
    })

    other_charges.forEach(item => {
      if (item.amount) total += item.amount
    })

    return total
  }, [currentSurcharges])

  // 總費用（基本團費 + 附加費用）
  const totalCost = useMemo(() => {
    return (baseCost || 0) + totalSurcharge
  }, [baseCost, totalSurcharge])

  // 開啟編輯對話框
  const handleOpenDialog = useCallback(() => {
    setEditData(currentSurcharges)
    setShowDialog(true)
  }, [currentSurcharges])

  // 關閉對話框
  const handleCloseDialog = useCallback(() => {
    setShowDialog(false)
  }, [])

  // 儲存變更
  const handleSave = useCallback(() => {
    onChange(memberId, editData)
    setShowDialog(false)
  }, [memberId, editData, onChange])

  // 數字輸入處理
  const handleNumberChange = useCallback((field: keyof MemberSurcharges, value: string) => {
    const num = value === '' ? null : parseInt(value.replace(/\D/g, ''), 10) || null
    setEditData(prev => ({ ...prev, [field]: num }))
  }, [])

  // 新增項目
  const handleAddItem = useCallback((field: 'add_on_items' | 'other_charges') => {
    setEditData(prev => ({
      ...prev,
      [field]: [...prev[field], { name: '', amount: 0 }],
    }))
  }, [])

  // 移除項目
  const handleRemoveItem = useCallback((field: 'add_on_items' | 'other_charges', index: number) => {
    setEditData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }))
  }, [])

  // 更新項目
  const handleUpdateItem = useCallback(
    (
      field: 'add_on_items' | 'other_charges',
      index: number,
      itemField: keyof SurchargeItem,
      value: string | number
    ) => {
      setEditData(prev => ({
        ...prev,
        [field]: prev[field].map((item, i) => {
          if (i === index) {
            if (itemField === 'amount') {
              const num =
                typeof value === 'string'
                  ? value === ''
                    ? 0
                    : parseInt(value.replace(/\D/g, ''), 10) || 0
                  : value
              return { ...item, [itemField]: num }
            }
            return { ...item, [itemField]: value }
          }
          return item
        }),
      }))
    },
    []
  )

  return (
    <>
      <td
        className="border border-morandi-gold/20 px-2 py-1 bg-morandi-gold/10/50 cursor-pointer hover:bg-morandi-gold/10/50 transition-colors"
        onClick={handleOpenDialog}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-xs">
            <Calculator size={10} className="text-morandi-primary/60" />
            <span className="text-morandi-primary font-medium">
              {totalSurcharge > 0 ? totalSurcharge.toLocaleString() : '-'}
            </span>
          </div>
          {totalSurcharge > 0 && (
            <div className="text-[0.588rem] text-morandi-secondary">
              {t('surchargeTotalPrefix')} {totalCost.toLocaleString()}
            </div>
          )}
        </div>
      </td>

      <FormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title={
          <span className="flex items-center gap-2">
            <Calculator size={16} />
            {memberName} - {SURCHARGE_LABELS.total_surcharge}
          </span>
        }
        onSubmit={handleSave}
        loading={false}
        submitLabel={t('surchargeSave')}
        cancelLabel={t('surchargeCancel')}
        onCancel={handleCloseDialog}
        level={2}
        maxWidth="2xl"
        contentClassName="max-h-[80vh] overflow-y-auto"
      >
        <div className="space-y-6 py-4">
          {/* 基本團費 */}
          <div className="flex items-center justify-between py-2 border-b border-border/60">
            <span className="font-medium text-morandi-primary">{SURCHARGE_LABELS.base_cost}</span>
            <span className="text-lg font-semibold text-morandi-primary">
              {(baseCost || 0).toLocaleString()}
            </span>
          </div>

          {/* 單人房差 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-morandi-primary">
              {SURCHARGE_LABELS.single_room_surcharge}
            </label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={editData.single_room_surcharge || ''}
              onChange={e => handleNumberChange('single_room_surcharge', e.target.value)}
              className="text-right"
            />
          </div>

          {/* 加購項目 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-morandi-primary">
                {SURCHARGE_LABELS.add_on_items}
              </label>
              <Button
                type="button"
                variant="soft-gold"
                size="sm"
                onClick={() => handleAddItem('add_on_items')}
                className={cn(ACTION_BUTTON_BASE, ACTION_BUTTON_DEFAULT_TONE)}
              >
                <Plus size="0.95em" />
                {SURCHARGE_LABELS.add_item}
              </Button>
            </div>
            {editData.add_on_items.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={t('surchargeItemName')}
                  value={item.name}
                  onChange={e => handleUpdateItem('add_on_items', index, 'name', e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder={t('surchargeAmount')}
                  value={item.amount || ''}
                  onChange={e => handleUpdateItem('add_on_items', index, 'amount', e.target.value)}
                  className="w-24 text-right"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem('add_on_items', index)}
                  className={cn(ACTION_BUTTON_BASE, 'text-status-danger hover:bg-status-danger-bg')}
                >
                  <Trash2 size="0.95em" />
                </Button>
              </div>
            ))}
          </div>

          {/* 其他費用 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-morandi-primary">
                {SURCHARGE_LABELS.other_charges}
              </label>
              <Button
                type="button"
                variant="soft-gold"
                size="sm"
                onClick={() => handleAddItem('other_charges')}
                className={cn(ACTION_BUTTON_BASE, ACTION_BUTTON_DEFAULT_TONE)}
              >
                <Plus size="0.95em" />
                {SURCHARGE_LABELS.add_item}
              </Button>
            </div>
            {editData.other_charges.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={t('surchargeCostName')}
                  value={item.name}
                  onChange={e => handleUpdateItem('other_charges', index, 'name', e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder={t('surchargeAmount')}
                  value={item.amount || ''}
                  onChange={e => handleUpdateItem('other_charges', index, 'amount', e.target.value)}
                  className="w-24 text-right"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem('other_charges', index)}
                  className={cn(ACTION_BUTTON_BASE, 'text-status-danger hover:bg-status-danger-bg')}
                >
                  <Trash2 size="0.95em" />
                </Button>
              </div>
            ))}
          </div>

          {/* 總計區域 */}
          <div className="space-y-2 p-4 bg-morandi-container/30 rounded-lg border">
            <div className="flex justify-between text-sm">
              <span>{SURCHARGE_LABELS.base_cost}</span>
              <span>{(baseCost || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{SURCHARGE_LABELS.total_surcharge}</span>
              <span className="text-morandi-gold font-medium">
                {(() => {
                  let total = 0
                  if (editData.single_room_surcharge) total += editData.single_room_surcharge
                  editData.add_on_items.forEach(item => {
                    if (item.amount) total += item.amount
                  })
                  editData.other_charges.forEach(item => {
                    if (item.amount) total += item.amount
                  })
                  return total.toLocaleString()
                })()}
              </span>
            </div>
            <hr className="border-border/60" />
            <div className="flex justify-between font-semibold">
              <span>{SURCHARGE_LABELS.total_cost}</span>
              <span className="text-lg text-morandi-primary">
                {(() => {
                  let surchargeTotal = 0
                  if (editData.single_room_surcharge)
                    surchargeTotal += editData.single_room_surcharge
                  editData.add_on_items.forEach(item => {
                    if (item.amount) surchargeTotal += item.amount
                  })
                  editData.other_charges.forEach(item => {
                    if (item.amount) surchargeTotal += item.amount
                  })
                  return ((baseCost || 0) + surchargeTotal).toLocaleString()
                })()}
              </span>
            </div>
          </div>
        </div>
      </FormDialog>
    </>
  )
}
