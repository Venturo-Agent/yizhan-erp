'use client'

/**
 * 護照照片預覽 Dialog — 共用版
 *
 * 從 OrderMembersExpandable 抽出、訂單頁 / 顧客頁共用。
 * 簽 15 分鐘短效 URL、不暴露原始 storage path。
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePassportImageUrl } from '@/lib/passport-storage/usePassportImageUrl'

interface PassportPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string | null | undefined
  title?: string | null
  level?: 1 | 2 | 3
}

export function PassportPreviewDialog({
  open,
  onOpenChange,
  imageUrl,
  title,
  level = 2,
}: PassportPreviewDialogProps) {
  const signedUrl = usePassportImageUrl(open ? imageUrl : null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent nested level={level} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title || '護照照片'}</DialogTitle>
        </DialogHeader>
        {imageUrl && signedUrl && (
          <div className="flex justify-center">
            <img
              src={signedUrl}
              alt="護照照片"
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
