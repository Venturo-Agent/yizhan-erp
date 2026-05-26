'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/dialog'
import { MapPin, X, CheckSquare, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { InlineEditTable, type InlineEditColumn } from '@/components/ui/inline-edit-table'

export interface LocalTier {
  id: string
  participants: number
  unitPrice: number
}

interface LocalPricingDialogProps {
  isOpen: boolean
  onClose: () => void
  totalParticipants: number
  onConfirm: (tiers: LocalTier[], matchedTierIndex: number) => void
  initialTiers?: LocalTier[]
  /** 提交中、防連點（disable 確認 + 取消按鈕） */
  loading?: boolean
}

export const LocalPricingDialog: React.FC<LocalPricingDialogProps> = ({
  isOpen,
  onClose,
  totalParticipants,
  onConfirm,
  initialTiers,
  loading = false,
}) => {
  const t = useTranslations('orders')
  const [tiers, setTiers] = useState<LocalTier[]>(
    initialTiers && initialTiers.length > 0
      ? initialTiers
      : [{ id: `tier-${Date.now()}`, participants: 0, unitPrice: 0 }] // 預設空白，使用者手動輸入
  )

  // 當對話框開啟時，同步 tiers 狀態
  useEffect(() => {
    if (isOpen) {
      if (initialTiers && initialTiers.length > 0) {
        setTiers(initialTiers)
      } else {
        setTiers([{ id: `tier-${Date.now()}`, participants: 0, unitPrice: 0 }])
      }
    }
  }, [isOpen, initialTiers])

  // 新增檻次
  const handleAddTier = () => {
    setTiers([
      ...tiers,
      {
        id: `tier-${Date.now()}`,
        participants: 0,
        unitPrice: 0,
      },
    ])
  }

  // 移除檻次
  const handleRemoveTier = (id: string) => {
    if (tiers.length <= 1) return
    setTiers(tiers.filter(t => t.id !== id))
  }

  // 更新檻次（支援全形轉半形）
  const handleUpdateTier = (id: string, field: 'participants' | 'unitPrice', value: string) => {
    // 全形數字 → 半形
    const normalized = value.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    const numValue = parseInt(normalized) || 0
    setTiers(tiers.map(t => (t.id === id ? { ...t, [field]: numValue } : t)))
  }

  // 找到目前總人數對應的檻次
  const findMatchedTierIndex = (): number => {
    // 按人數排序（從小到大）
    const sortedTiers = [...tiers].sort((a, b) => a.participants - b.participants)

    // 找到最大的且 <= totalParticipants 的檻次
    let matchedIndex = 0
    for (let i = 0; i < sortedTiers.length; i++) {
      if (sortedTiers[i].participants <= totalParticipants) {
        matchedIndex = i
      } else {
        break
      }
    }

    // 返回在原始 tiers 陣列中的索引
    const matchedTier = sortedTiers[matchedIndex]
    return tiers.findIndex(t => t.id === matchedTier.id)
  }

  // 點擊確認
  const handleConfirmClick = () => {
    if (loading) return
    // 檢查是否有填寫人數和單價
    const hasEmptyData = tiers.some(
      t => !t.participants || t.participants <= 0 || !t.unitPrice || t.unitPrice <= 0
    )
    if (hasEmptyData) {
      return
    }

    const matched = findMatchedTierIndex()
    onConfirm(tiers, matched)
    onClose()
  }

  // 取得對應檻次的資訊
  const getMatchedTierInfo = () => {
    const matched = findMatchedTierIndex()
    const tier = tiers[matched]
    return tier
  }

  const matchedTier = getMatchedTierInfo()

  const isSubmitDisabled = tiers.some(
    t => !t.participants || t.participants <= 0 || !t.unitPrice || t.unitPrice <= 0
  )

  const customFooter = (
    <div className="flex justify-end gap-2">
      <Button variant="soft-gold" onClick={onClose} disabled={loading}>
        <X className="w-4 h-4 mr-2" />
        {t('quoteLocalPricingCancel')}
      </Button>
      <Button
        variant="morandi-gold"
        onClick={handleConfirmClick}
        disabled={isSubmitDisabled || loading}
      >
        <CheckSquare className="w-4 h-4 mr-2" />
        {loading ? '處理中...' : t('quoteLocalPricingConfirm')}
      </Button>
    </div>
  )

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={open => !open && !loading && onClose()}
      title={
        <span className="flex items-center gap-2">
          <MapPin size={18} className="text-morandi-gold" />
          {t('quoteLocalPricingTitle')}
        </span>
      }
      onSubmit={handleConfirmClick}
      submitDisabled={isSubmitDisabled || loading}
      loading={loading}
      footer={customFooter}
      maxWidth="lg"
    >
      {/* 目前總人數提示 */}
      <div className="bg-morandi-container/30 rounded-lg px-4 py-3 text-sm">
        <span className="text-morandi-secondary">{t('quoteLocalPricingCurrentTotal')}</span>
        <span className="font-semibold text-morandi-primary ml-1">
          {totalParticipants}
          {t('quoteLocalPricingPeople')}
        </span>
      </div>

      {/* 檻次輸入區 */}
      <InlineEditTable<LocalTier>
        variant="minimal"
        rows={tiers}
        columns={
          [
            {
              key: 'index',
              label: t('localPricingTierLabel'),
              width: '80px',
              render: ({ index }) => (
                <span className="text-sm text-morandi-secondary">
                  {t('quoteLocalPricingTierIndex', { index: index + 1 })}
                </span>
              ),
            },
            {
              key: 'participants',
              label: t('quoteLocalPricingTierThreshold'),
              render: ({ row }) => (
                <Input
                  type="number"
                  value={row.participants || ''}
                  onChange={e => handleUpdateTier(row.id, 'participants', e.target.value)}
                  placeholder={t('quoteLocalPricingTierCount')}
                  className="h-9 text-sm"
                />
              ),
            },
            {
              key: 'unitPrice',
              label: t('quoteLocalPricingTierUnitPrice'),
              render: ({ row }) => (
                <Input
                  type="number"
                  value={row.unitPrice || ''}
                  onChange={e => handleUpdateTier(row.id, 'unitPrice', e.target.value)}
                  placeholder={t('quoteAccommodationUnitPrice')}
                  className="h-9 text-sm"
                />
              ),
            },
          ] satisfies InlineEditColumn<LocalTier>[]
        }
        onRemove={index => handleRemoveTier(tiers[index].id)}
        canRemove={() => tiers.length > 1}
        footer={
          <tr>
            <td colSpan={4} className="pt-3">
              <Button
                variant="soft-gold"
                size="sm"
                onClick={handleAddTier}
                className="w-full gap-2"
              >
                <Plus size={14} />
                {t('quoteLocalPricingAddTier')}
              </Button>
            </td>
          </tr>
        }
      />

      {/* 對應提示 */}
      {matchedTier && matchedTier.unitPrice > 0 && (
        <div className="bg-morandi-gold/10 rounded-lg px-4 py-3 text-sm">
          <span className="text-morandi-secondary">
            {t('quoteLocalPricingWillUse', {
              totalParticipants,
              matchedParticipants: matchedTier.participants,
            })}
          </span>
          <span className="font-semibold text-morandi-gold ml-1">
            {t('quoteLocalPricingUnitPrice', { unitPrice: matchedTier.unitPrice.toLocaleString() })}
          </span>
        </div>
      )}
    </FormDialog>
  )
}
