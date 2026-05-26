'use client'

/**
 * ResourceOverrideDialog - 本團覆蓋對話框
 * 左邊照片、右邊文字編輯，只影響當前團
 */

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Save, Star } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'

const COMPONENT_LABELS = {
  TOAST_SAVED: '已儲存',
  TOAST_SAVE_FAILED: '儲存失敗',
  TITLE_PREFIX: '編輯本團內容 - ',
  COVER: '封面',
  ORIGINAL_DESC: '資料庫原始內容',
  TOUR_SPECIFIC_DESC: '本團專用介紹',
  TOUR_SPECIFIC_PLACEHOLDER: '留空則使用資料庫原始內容',
  TOUR_SCOPE_HINT: '此修改只影響這一團',
  CANCEL: '取消',
  SAVING: '儲存中...',
  SAVE: '儲存',
} as const

interface ResourceOverrideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resourceName: string
  tourItineraryItemId: string
  currentOverride?: string | null
  originalDescription?: string | null
  images?: string[]
  onSave?: (description: string) => void
}

export function ResourceOverrideDialog({
  open,
  onOpenChange,
  resourceName,
  tourItineraryItemId,
  currentOverride,
  originalDescription,
  images = [],
  onSave,
}: ResourceOverrideDialogProps) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [description, setDescription] = useState('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const supabase = createSupabaseBrowserClient()

  const hasImages = images.length > 0

  useEffect(() => {
    if (open) {
      setDescription(currentOverride || '')
      setCurrentImageIndex(0)
    }
  }, [open, currentOverride])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('tour_itinerary_items')
        .update({
          override_description: description || null,
          override_by: user?.id,
          override_at: new Date().toISOString(),
        })
        .eq('id', tourItineraryItemId)

      if (error) throw error

      toast.success(COMPONENT_LABELS.TOAST_SAVED)
      onSave?.(description)
      onOpenChange(false)
    } catch (err) {
      logger.error('儲存失敗:', err)
      toast.error(COMPONENT_LABELS.TOAST_SAVE_FAILED)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={2} className={hasImages ? 'max-w-3xl' : 'max-w-md'}>
        <DialogHeader>
          <DialogTitle>
            {COMPONENT_LABELS.TITLE_PREFIX}
            {resourceName}
          </DialogTitle>
        </DialogHeader>

        <div className={hasImages ? 'flex gap-6' : 'space-y-4'}>
          {/* 左側：圖片 */}
          {hasImages && (
            <div className="w-[17.5rem] flex-shrink-0 space-y-2">
              {/* 主圖 */}
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                <img
                  src={images[currentImageIndex]}
                  alt={resourceName}
                  className="w-full h-full object-cover"
                />
                {/* 封面標記 */}
                {currentImageIndex === 0 && images.length > 1 && (
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Star size="0.625em" className="fill-current" /> {COMPONENT_LABELS.COVER}
                  </div>
                )}
                {/* 圖片計數 */}
                {images.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                )}
              </div>
              {/* 縮圖列表 */}
              {images.length > 1 && (
                <div className="flex gap-1 overflow-x-auto">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`relative w-14 h-10 flex-shrink-0 rounded overflow-hidden border-2 transition-colors ${
                        idx === currentImageIndex ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <Star
                          size="0.5em"
                          className="absolute top-0.5 left-0.5 text-white fill-current drop-shadow"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 右側：文字編輯 */}
          <div className="flex-1 space-y-4">
            {/* 原始內容 */}
            {originalDescription && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {COMPONENT_LABELS.ORIGINAL_DESC}
                </Label>
                <div className="p-2 bg-muted/50 rounded text-sm text-muted-foreground max-h-24 overflow-y-auto">
                  {originalDescription}
                </div>
              </div>
            )}

            {/* 覆蓋內容 */}
            <div className="space-y-2">
              <Label>{COMPONENT_LABELS.TOUR_SPECIFIC_DESC}</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={COMPONENT_LABELS.TOUR_SPECIFIC_PLACEHOLDER}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">{COMPONENT_LABELS.TOUR_SCOPE_HINT}</p>
            </div>

            {/* 按鈕 */}
            <div className="flex justify-end gap-2">
              <Button variant="soft-gold" onClick={() => onOpenChange(false)}>
                {COMPONENT_LABELS.CANCEL}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save size="1em" className="mr-1" />
                {saving ? COMPONENT_LABELS.SAVING : COMPONENT_LABELS.SAVE}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
