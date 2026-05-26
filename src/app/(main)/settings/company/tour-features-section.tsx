'use client'

import { useState, useEffect } from 'react'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Save, AlertCircle } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import { TOUR_SERVICE_TYPES } from '@/lib/constants/tour-service-types'

const PAGE_LABELS = {
  TOUR_FEATURES_TITLE: '旅行屬性功能設定',
  AVAILABLE_TOUR_TYPES: '可選團類型',
  REQUIRED_AT_LEAST_ONE: '至少要選一個團類型',
  SAVE_SUCCESS_PREFIX: '已儲存，可用 ',
  SAVE_SUCCESS_SUFFIX: ' 種團類型',
  SAVE_FAILED: '儲存失敗',
} as const

// ============================================
// 旅行屬性功能設定區塊
// ============================================
export function TourAttributesSection({ workspaceId }: { workspaceId: string }) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'tour_group',
    'flight',
    'flight_hotel',
    'hotel',
    'car_service',
    'esim',
  ])
  const [loading, setLoading] = useState(true)

  // 載入目前設定
  useEffect(() => {
    if (!workspaceId) return
    const load = async () => {
      try {
        const { data } = await supabase
          .from('workspaces')
          .select('id,enabled_tour_categories')
          .eq('id', workspaceId)
          .single()
        const cats = (data as { enabled_tour_categories?: string[] } | null)
          ?.enabled_tour_categories
        if (Array.isArray(cats) && cats.length > 0) {
          setSelectedCategories(cats)
        }
      } catch (err) {
        logger.error('載入團類型設定失敗:', err)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [workspaceId])

  // 所有可用的團類型 — 從 SSOT 衍生（src/lib/constants/tour-service-types.ts）
  // 加新類型只改 SSOT、本檔不用動
  const tourCategories = TOUR_SERVICE_TYPES.map(t => ({
    id: t.id,
    label: t.label,
    description: t.description,
  }))

  // 切換單一類別
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    )
  }

  // 選擇全部
  const selectAll = () => {
    setSelectedCategories(tourCategories.map(cat => cat.id))
  }

  // 清除全部
  const clearAll = () => {
    setSelectedCategories([])
  }

  // 儲存團類型設定到 DB（過濾 ghost id、避免殘留舊類型）
  const { isSubmitting: saving, execute: handleSave } = useAsyncSubmit(
    async () => {
      const cleaned = selectedCategories.filter(id => tourCategories.some(c => c.id === id))
      if (cleaned.length === 0) {
        toast.error(PAGE_LABELS.REQUIRED_AT_LEAST_ONE)
        return
      }
      const { error } = await (
        supabase.from('workspaces') as unknown as {
          update: (data: Record<string, unknown>) => {
            eq: (col: string, val: string) => Promise<{ error: unknown }>
          }
        }
      )
        .update({ enabled_tour_categories: cleaned })
        .eq('id', workspaceId)
      if (error) throw error
      setSelectedCategories(cleaned)
      toast.success(
        `${PAGE_LABELS.SAVE_SUCCESS_PREFIX}${cleaned.length}${PAGE_LABELS.SAVE_SUCCESS_SUFFIX}`
      )
    },
    {
      onError: error => {
        logger.error('儲存團類型設定失敗:', error)
        toast.error(PAGE_LABELS.SAVE_FAILED)
      },
    }
  )

  if (loading) return null

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-morandi-primary">
          {PAGE_LABELS.TOUR_FEATURES_TITLE}
        </h3>
        <p className="text-sm text-morandi-secondary">
          選擇可用的團類型，開團時會顯示對應的選擇欄位
        </p>
      </div>

      <div className="space-y-4">
        {/* 團類型選擇 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{PAGE_LABELS.AVAILABLE_TOUR_TYPES}</Label>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tourCategories.map(category => (
              <div
                key={category.id}
                className={`flex items-start space-x-3 p-3 rounded-md border ${
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
                <div className="space-y-1">
                  <Label htmlFor={`category-${category.id}`} className="font-medium cursor-pointer">
                    {category.label}
                  </Label>
                  <p className="text-xs text-morandi-secondary">{category.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 注意事項：只算現在 UI 認識的 id（避免 DB 殘留 ghost id 灌水） */}
          {(() => {
            const validCount = selectedCategories.filter(id =>
              tourCategories.some(c => c.id === id)
            ).length
            const ghosts = selectedCategories.filter(id => !tourCategories.some(c => c.id === id))
            if (validCount === 0) return null
            return (
              <div className="flex items-start gap-2 p-3 bg-morandi-gold/10 border border-morandi-gold/20 rounded-md">
                <AlertCircle className="h-4 w-4 text-morandi-gold mt-0.5" />
                <div className="text-sm text-morandi-secondary space-y-1">
                  <p>開團時，可從已選擇的 {validCount} 種團類型中選擇一種</p>
                  {ghosts.length > 0 && (
                    <p className="text-xs text-morandi-muted">
                      （DB 內另有 {ghosts.length} 個未啟用的舊類型 id：{ghosts.join('、')}
                      、儲存時會清除）
                    </p>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* 儲存按鈕 */}
      <Button onClick={handleSave} disabled={saving}>
        {saving ? (
          <span className="flex items-center">
            <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
            儲存中...
          </span>
        ) : (
          <span className="flex items-center">
            <Save className="h-4 w-4 mr-2" />
            儲存設定
          </span>
        )}
      </Button>
    </Card>
  )
}
