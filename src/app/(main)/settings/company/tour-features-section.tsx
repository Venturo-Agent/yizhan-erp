'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { TOUR_SERVICE_TYPES } from '@/constants/tour-service-types'

interface TourAttributesSectionProps {
  selectedCategories: string[]
  onChange: (categories: string[]) => void
}

/**
 * 旅行屬性功能設定
 *
 * 2026-05-28 William 拍板：
 * - state 提到 page form（受控）、跟主標題列的整體儲存按鈕一起存
 * - 不再有獨立儲存按鈕（呼應 2026-05-21 「儲存統一在主標題區」紀律）
 * - UI 4 欄 2 排、移除每項說明、移除注意框
 */
export function TourAttributesSection({
  selectedCategories,
  onChange,
}: TourAttributesSectionProps) {
  const tourCategories = TOUR_SERVICE_TYPES.map(t => ({ id: t.id, label: t.label }))

  const toggleCategory = (id: string) => {
    onChange(
      selectedCategories.includes(id)
        ? selectedCategories.filter(c => c !== id)
        : [...selectedCategories, id]
    )
  }

  const selectAll = () => onChange(tourCategories.map(c => c.id))
  const clearAll = () => onChange([])

  return (
    <Card
      id="field-tour-attributes"
      className="rounded-xl shadow-sm border border-border p-6 space-y-4 scroll-mt-24"
    >
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-morandi-primary">旅行屬性功能設定</h3>
        <p className="text-sm text-morandi-secondary">開團時可從以下類型中選擇</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>可選團類型</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="soft-gold"
              size="sm"
              onClick={selectAll}
              disabled={selectedCategories.length === tourCategories.length}
            >
              全選
            </Button>
            <Button
              type="button"
              variant="soft-gold"
              size="sm"
              onClick={clearAll}
              disabled={selectedCategories.length === 0}
            >
              清除
            </Button>
          </div>
        </div>

        {/* 4 欄 × 2 排（桌面）/ 手機 2 欄 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tourCategories.map(category => (
            <div
              key={category.id}
              className={`flex items-center space-x-3 p-3 rounded-md border ${
                selectedCategories.includes(category.id)
                  ? 'border-morandi-gold bg-morandi-gold/5'
                  : 'border-morandi-border'
              }`}
            >
              <Checkbox
                id={`category-${category.id}`}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => toggleCategory(category.id)}
              />
              <Label htmlFor={`category-${category.id}`} className="font-medium cursor-pointer">
                {category.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
