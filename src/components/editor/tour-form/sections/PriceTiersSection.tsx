'use client'

import React from 'react'
import { TourFormData, PriceTier } from '../types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Users, GripVertical, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TierPricing } from '@/stores/types/quote.types'
import { COMP_EDITOR_LABELS } from '../../constants/labels'

interface PriceTiersSectionProps {
  data: TourFormData
  onChange: (data: TourFormData) => void
  quoteTierPricings?: TierPricing[] // 從報價單帶入的檻次表
}

// 格式化價格（加千分位逗號）
const formatPrice = (value: string): string => {
  // 移除非數字字元
  const numericValue = value.replace(/[^\d]/g, '')
  if (!numericValue) return ''
  // 加上千分位逗號
  return Number(numericValue).toLocaleString('en-US')
}

// 解析價格（移除逗號）
const _parsePrice = (value: string): string => {
  return value.replace(/,/g, '')
}

// 從報價單的 TierPricing 轉換為行程表的 PriceTier
const convertFromQuoteTierPricings = (tierPricings: TierPricing[]): PriceTier[] => {
  return tierPricings.map(tier => ({
    label: `${tier.participant_count}人成團`,
    sublabel: COMP_EDITOR_LABELS.每人,
    price: formatPrice(String(tier.selling_prices?.adult || 0)),
    priceNote: COMP_EDITOR_LABELS.起,
    addon: '',
  }))
}

// 預設價格方案
const getDefaultPriceTiers = (): PriceTier[] => [
  {
    label: COMP_EDITOR_LABELS._4人包團,
    sublabel: COMP_EDITOR_LABELS.每人,
    price: '',
    priceNote: COMP_EDITOR_LABELS.起,
    addon: COMP_EDITOR_LABELS.加購1日包車_每人_NT_900,
  },
  {
    label: COMP_EDITOR_LABELS._6人包團,
    sublabel: COMP_EDITOR_LABELS.每人,
    price: '',
    priceNote: COMP_EDITOR_LABELS.起,
    addon: COMP_EDITOR_LABELS.加購1日包車_每人_NT_800,
  },
  {
    label: COMP_EDITOR_LABELS._8人包團,
    sublabel: COMP_EDITOR_LABELS.每人,
    price: '',
    priceNote: COMP_EDITOR_LABELS.起,
    addon: COMP_EDITOR_LABELS.加購1日包車_每人_NT_600,
  },
]

export function PriceTiersSection({ data, onChange, quoteTierPricings }: PriceTiersSectionProps) {
  const priceTiers = data.priceTiers || getDefaultPriceTiers()

  // 從報價單帶入檻次表
  const importFromQuote = () => {
    if (!quoteTierPricings || quoteTierPricings.length === 0) return
    const converted = convertFromQuoteTierPricings(quoteTierPricings)
    onChange({ ...data, priceTiers: converted, showPriceTiers: true })
  }

  // 更新價格方案
  const updatePriceTier = (index: number, updates: Partial<PriceTier>) => {
    const newTiers = [...priceTiers]
    newTiers[index] = { ...newTiers[index], ...updates }
    onChange({ ...data, priceTiers: newTiers })
  }

  // 新增價格方案
  const addPriceTier = () => {
    const newTiers = [
      ...priceTiers,
      {
        label: `${priceTiers.length + 4}人包團`,
        sublabel: COMP_EDITOR_LABELS.每人,
        price: '',
        priceNote: COMP_EDITOR_LABELS.起,
        addon: '',
      },
    ]
    onChange({ ...data, priceTiers: newTiers })
  }

  // 刪除價格方案
  const removePriceTier = (index: number) => {
    if (priceTiers.length <= 1) return
    const newTiers = priceTiers.filter((_, i) => i !== index)
    onChange({ ...data, priceTiers: newTiers })
  }

  return (
    <div className="space-y-6">
      {/* 區塊標題 */}
      <h2 className="text-lg font-bold text-morandi-primary border-b-2 border-morandi-gold pb-1">
        {COMP_EDITOR_LABELS.價格方案}
      </h2>

      {/* 顯示開關 */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-morandi-primary" />
          <div>
            <h3 className="font-medium text-morandi-primary">
              {COMP_EDITOR_LABELS.多人數價格方案}
            </h3>
            <p className="text-sm text-morandi-secondary">{COMP_EDITOR_LABELS.LABEL_6795}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 從報價單帶入按鈕 */}
          {quoteTierPricings && quoteTierPricings.length > 0 && (
            <Button
              type="button"
              variant="soft-gold"
              size="sm"
              onClick={importFromQuote}
              className="gap-1.5 text-morandi-gold border-morandi-gold hover:bg-morandi-gold hover:text-white"
            >
              <Download className="h-4 w-4" />
              從報價單帶入 ({quoteTierPricings.length})
            </Button>
          )}
          <Switch
            checked={data.showPriceTiers || false}
            onCheckedChange={checked => {
              onChange({
                ...data,
                showPriceTiers: checked,
                priceTiers: checked && !data.priceTiers ? getDefaultPriceTiers() : data.priceTiers,
              })
            }}
          />
        </div>
      </div>

      {/* 主內容區域 */}
      {data.showPriceTiers && (
        <div className="space-y-4">
          {/* 價格方案列表 - 根據數量自適應 */}
          <div
            className={cn(
              'grid gap-4',
              priceTiers.length === 1 && 'grid-cols-1',
              priceTiers.length === 2 && 'grid-cols-1 md:grid-cols-2',
              priceTiers.length >= 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            )}
          >
            {priceTiers.map((tier, index) => (
              <div
                key={index}
                className="p-4 border border-morandi-container rounded-lg bg-card space-y-3"
              >
                {/* 標題列 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-morandi-muted" />
                    <span className="text-sm font-medium text-morandi-secondary">
                      方案 {index + 1}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePriceTier(index)}
                    disabled={priceTiers.length <= 1}
                    className="h-7 w-7 p-0 text-morandi-muted hover:text-status-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* 方案名稱 */}
                <div>
                  <Label className="text-xs text-morandi-primary">
                    {COMP_EDITOR_LABELS.方案名稱}
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={tier.label}
                      onChange={e => updatePriceTier(index, { label: e.target.value })}
                      placeholder={COMP_EDITOR_LABELS.如_4人包團}
                      className="flex-1"
                    />
                    <Input
                      value={tier.sublabel || ''}
                      onChange={e => updatePriceTier(index, { sublabel: e.target.value })}
                      placeholder={COMP_EDITOR_LABELS.每人}
                      className="w-20"
                    />
                  </div>
                </div>

                {/* 價格 */}
                <div>
                  <Label className="text-xs text-morandi-primary">{COMP_EDITOR_LABELS.價格}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={tier.price}
                      onChange={e => {
                        // 只允許數字和逗號
                        const value = e.target.value.replace(/[^\d,]/g, '')
                        updatePriceTier(index, { price: value })
                      }}
                      onBlur={e => {
                        // 失去焦點時格式化
                        const formatted = formatPrice(tier.price)
                        if (formatted !== tier.price) {
                          updatePriceTier(index, { price: formatted })
                        }
                      }}
                      placeholder="34,500"
                      className="flex-1"
                    />
                    <Input
                      value={tier.priceNote || ''}
                      onChange={e => updatePriceTier(index, { priceNote: e.target.value })}
                      placeholder={COMP_EDITOR_LABELS.起}
                      className="w-16"
                    />
                  </div>
                </div>

                {/* 加購說明 */}
                <div>
                  <Label className="text-xs text-morandi-primary">
                    {COMP_EDITOR_LABELS.LABEL_9399}
                  </Label>
                  <Input
                    value={tier.addon || ''}
                    onChange={e => updatePriceTier(index, { addon: e.target.value })}
                    placeholder={COMP_EDITOR_LABELS.如_加購1日包車_每人_NT_900}
                    className="mt-1"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 新增按鈕 */}
          <Button
            type="button"
            variant="soft-gold"
            onClick={addPriceTier}
            className="w-full border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            {COMP_EDITOR_LABELS.ADD_9299}
          </Button>

          {/* 預覽提示 */}
          <div className="p-3 bg-status-warning-bg border border-status-warning rounded-lg">
            <p className="text-sm text-status-warning">
              💡 價格方案會顯示在行程頁面的「團費說明」區塊，建議設定至少 2-3 個不同人數的方案。
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
