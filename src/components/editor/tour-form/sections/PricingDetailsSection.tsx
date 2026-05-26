'use client'

import React from 'react'
import { TourFormData, PricingItem, PricingDetails } from '../types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, X, Plus, Trash2, DollarSign, Shield, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMP_EDITOR_LABELS } from '../../constants/labels'

interface PricingDetailsSectionProps {
  data: TourFormData
  updateField: (field: string, value: unknown) => void
  onChange: (data: TourFormData) => void
}

// 計算有效期限（從現在起3天內）
const getValidityDate = (): string => {
  const date = new Date()
  date.setDate(date.getDate() + 3)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 預設值
const getDefaultPricingDetails = (): PricingDetails => ({
  show_pricing_details: false,
  insurance_amount: '500',
  included_items: [
    { text: COMP_EDITOR_LABELS.行程表所列之交通費用, included: true },
    { text: COMP_EDITOR_LABELS.行程表所列之住宿費用, included: true },
    { text: COMP_EDITOR_LABELS.行程表所列之餐食費用, included: true },
    { text: COMP_EDITOR_LABELS.行程表所列之門票費用, included: true },
    { text: COMP_EDITOR_LABELS.專業導遊服務, included: true },
    { text: COMP_EDITOR_LABELS.旅遊責任險_500_萬元, included: true },
  ],
  excluded_items: [
    { text: COMP_EDITOR_LABELS.個人護照及簽證費用, included: false },
    { text: COMP_EDITOR_LABELS.行程外之自費行程, included: false },
    { text: COMP_EDITOR_LABELS.個人消費及小費, included: false },
    { text: COMP_EDITOR_LABELS.行李超重費用, included: false },
    { text: COMP_EDITOR_LABELS.單人房差價, included: false },
  ],
  notes: [
    `本報價單有效期限至 ${getValidityDate()}，逾期請重新報價。`,
    COMP_EDITOR_LABELS.最終價格以確認訂單時之匯率及費用為準,
    COMP_EDITOR_LABELS.如遇旺季或特殊節日_價格可能會有調整,
    COMP_EDITOR_LABELS.出發前_30_天內取消_需支付團費_30_作為取消費,
    COMP_EDITOR_LABELS.出發前_14_天內取消_需支付團費_50_作為取消費,
    COMP_EDITOR_LABELS.出發前_7_天內取消_需支付團費_100_作為取消費,
  ],
})

export function PricingDetailsSection({
  data,
  updateField: _updateField,
  onChange,
}: PricingDetailsSectionProps) {
  const pricingDetails = data.pricingDetails || getDefaultPricingDetails()

  // 更新 pricingDetails
  const updatePricingDetails = (updates: Partial<PricingDetails>) => {
    const newPricingDetails = { ...pricingDetails, ...updates }
    onChange({ ...data, pricingDetails: newPricingDetails })
  }

  // 更新包含項目
  const updateIncludedItem = (index: number, updates: Partial<PricingItem>) => {
    const newItems = [...pricingDetails.included_items]
    newItems[index] = { ...newItems[index], ...updates }
    updatePricingDetails({ included_items: newItems })
  }

  // 新增包含項目
  const addIncludedItem = () => {
    const newItems = [...pricingDetails.included_items, { text: '', included: true }]
    updatePricingDetails({ included_items: newItems })
  }

  // 刪除包含項目
  const removeIncludedItem = (index: number) => {
    const newItems = pricingDetails.included_items.filter((_, i) => i !== index)
    updatePricingDetails({ included_items: newItems })
  }

  // 更新不含項目
  const updateExcludedItem = (index: number, updates: Partial<PricingItem>) => {
    const newItems = [...pricingDetails.excluded_items]
    newItems[index] = { ...newItems[index], ...updates }
    updatePricingDetails({ excluded_items: newItems })
  }

  // 新增不含項目
  const addExcludedItem = () => {
    const newItems = [...pricingDetails.excluded_items, { text: '', included: false }]
    updatePricingDetails({ excluded_items: newItems })
  }

  // 刪除不含項目
  const removeExcludedItem = (index: number) => {
    const newItems = pricingDetails.excluded_items.filter((_, i) => i !== index)
    updatePricingDetails({ excluded_items: newItems })
  }

  // 更新注意事項
  const updateNote = (index: number, text: string) => {
    const newNotes = [...pricingDetails.notes]
    newNotes[index] = text
    updatePricingDetails({ notes: newNotes })
  }

  // 新增注意事項
  const addNote = () => {
    const newNotes = [...pricingDetails.notes, '']
    updatePricingDetails({ notes: newNotes })
  }

  // 刪除注意事項
  const removeNote = (index: number) => {
    const newNotes = pricingDetails.notes.filter((_, i) => i !== index)
    updatePricingDetails({ notes: newNotes })
  }

  // 處理保險金額變更，同時更新項目列表中的「旅遊責任險」
  const handleInsuranceChange = (amount: string) => {
    updatePricingDetails({ insurance_amount: amount })
    // 更新包含項目中的保險文字
    const insuranceIndex = pricingDetails.included_items.findIndex(item =>
      item.text.includes(COMP_EDITOR_LABELS.旅遊責任險)
    )
    if (insuranceIndex !== -1) {
      const newItems = [...pricingDetails.included_items]
      newItems[insuranceIndex] = {
        ...newItems[insuranceIndex],
        text: `${COMP_EDITOR_LABELS.旅遊責任險} ${amount} ${COMP_EDITOR_LABELS.LABEL_646}`,
      }
      updatePricingDetails({ included_items: newItems, insurance_amount: amount })
    }
  }

  return (
    <div className="space-y-6">
      {/* 區塊標題 */}
      <h2 className="text-lg font-bold text-morandi-primary border-b-2 border-morandi-gold pb-1">
        {COMP_EDITOR_LABELS.LABEL_9319}
      </h2>

      {/* 顯示開關 */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
        <div className="flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-morandi-primary" />
          <div>
            <h3 className="font-medium text-morandi-primary">{COMP_EDITOR_LABELS.LABEL_8607}</h3>
            <p className="text-sm text-morandi-secondary">{COMP_EDITOR_LABELS.LABEL_5515}</p>
          </div>
        </div>
        <Switch
          checked={data.showPricingDetails || false}
          onCheckedChange={checked => {
            // 同時更新 showPricingDetails 和 pricingDetails.show_pricing_details
            const newPricingDetails = {
              ...pricingDetails,
              show_pricing_details: checked,
            }
            onChange({
              ...data,
              showPricingDetails: checked,
              pricingDetails: newPricingDetails,
            })
          }}
        />
      </div>

      {/* 主內容區域 */}
      {data.showPricingDetails && (
        <div className="space-y-6">
          {/* 旅遊責任險選擇 */}
          <div className="p-4 border border-morandi-container rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-status-success" />
              <Label className="font-medium">{COMP_EDITOR_LABELS.旅遊責任險}</Label>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={pricingDetails.insurance_amount || '500'}
                onValueChange={handleInsuranceChange}
              >
                <SelectTrigger className="w-[11.25rem]">
                  <SelectValue placeholder={COMP_EDITOR_LABELS.選擇保險金額} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="250">250 {COMP_EDITOR_LABELS.LABEL_646}</SelectItem>
                  <SelectItem value="300">300 {COMP_EDITOR_LABELS.LABEL_646}</SelectItem>
                  <SelectItem value="500">500 {COMP_EDITOR_LABELS.LABEL_646}</SelectItem>
                  <SelectItem value="custom">{COMP_EDITOR_LABELS.LABEL_2157}</SelectItem>
                </SelectContent>
              </Select>
              {pricingDetails.insurance_amount === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder={COMP_EDITOR_LABELS.輸入金額}
                    className="w-24"
                    onChange={e => {
                      const customAmount = e.target.value
                      handleInsuranceChange(customAmount)
                    }}
                  />
                  <span className="text-sm text-morandi-secondary">
                    {COMP_EDITOR_LABELS.LABEL_646}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 費用包含 */}
          <div className="p-4 border border-morandi-container rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-status-success" />
                <Label className="font-medium">{COMP_EDITOR_LABELS.LABEL_5450}</Label>
              </div>
              <Button
                type="button"
                variant="soft-gold"
                size="sm"
                onClick={addIncludedItem}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                {COMP_EDITOR_LABELS.新增}
              </Button>
            </div>
            <div className="space-y-2">
              {pricingDetails.included_items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateIncludedItem(index, { included: !item.included })}
                    className={cn(
                      'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors',
                      item.included
                        ? 'bg-status-success/10 text-status-success'
                        : 'bg-muted text-morandi-muted'
                    )}
                  >
                    {item.included ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </button>
                  <Input
                    value={item.text}
                    onChange={e => updateIncludedItem(index, { text: e.target.value })}
                    placeholder={COMP_EDITOR_LABELS.輸入項目內容}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeIncludedItem(index)}
                    className="h-8 w-8 p-0 text-morandi-muted hover:text-status-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* 費用不含 */}
          <div className="p-4 border border-morandi-container rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-status-danger" />
                <Label className="font-medium">{COMP_EDITOR_LABELS.LABEL_4561}</Label>
              </div>
              <Button
                type="button"
                variant="soft-gold"
                size="sm"
                onClick={addExcludedItem}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                {COMP_EDITOR_LABELS.新增}
              </Button>
            </div>
            <div className="space-y-2">
              {pricingDetails.excluded_items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateExcludedItem(index, { included: !item.included })}
                    className={cn(
                      'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors',
                      item.included
                        ? 'bg-status-success/10 text-status-success'
                        : 'bg-status-danger-bg text-status-danger'
                    )}
                  >
                    {item.included ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </button>
                  <Input
                    value={item.text}
                    onChange={e => updateExcludedItem(index, { text: e.target.value })}
                    placeholder={COMP_EDITOR_LABELS.輸入項目內容}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExcludedItem(index)}
                    className="h-8 w-8 p-0 text-morandi-muted hover:text-status-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* 注意事項 */}
          <div className="p-4 border border-morandi-container rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-status-warning" />
                <Label className="font-medium">{COMP_EDITOR_LABELS.LABEL_8733}</Label>
              </div>
              <Button
                type="button"
                variant="soft-gold"
                size="sm"
                onClick={addNote}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                {COMP_EDITOR_LABELS.新增}
              </Button>
            </div>
            <div className="space-y-2">
              {pricingDetails.notes.map((note, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-2 text-sm text-morandi-secondary">
                    {index + 1}.
                  </span>
                  <Textarea
                    value={note}
                    onChange={e => updateNote(index, e.target.value)}
                    placeholder={COMP_EDITOR_LABELS.輸入注意事項}
                    className="flex-1 min-h-[3.75rem] resize-none"
                    rows={2}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeNote(index)}
                    className="h-8 w-8 p-0 text-morandi-muted hover:text-status-danger mt-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
