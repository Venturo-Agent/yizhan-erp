'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { Area } from 'react-easy-crop'
import type { ComponentType } from 'react'
import { Upload, X, Loader2, Crop as CropIcon } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import { useTranslations } from 'next-intl'

// react-easy-crop 只在 client、避免 SSR 撞 window
// next/dynamic 對 lib 的 type 推得不全、用最小必要 props 做 typed wrapper
type CropperMinProps = {
  image: string
  crop: { x: number; y: number }
  zoom: number
  aspect?: number
  cropShape?: 'rect' | 'round'
  showGrid?: boolean
  onCropChange: (c: { x: number; y: number }) => void
  onZoomChange: (z: number) => void
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void
}
const Cropper = dynamic(() => import('react-easy-crop'), {
  ssr: false,
}) as unknown as ComponentType<CropperMinProps>

const STORAGE_BUCKET = 'company-assets'
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Logo / 印鑑統一 resize 規格:最長邊 800px、PNG 保透明
const IMAGE_MAX_LONG_EDGE = 800

export async function resizeImage(file: File, maxLongEdge = IMAGE_MAX_LONG_EDGE): Promise<File> {
  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file)
    const { width, height } = bitmap

    // 已小於目標尺寸 → 不 resize、直接返回原檔(避免 jpeg→png 變大)
    if (Math.max(width, height) <= maxLongEdge) {
      return file
    }

    const scale = maxLongEdge / Math.max(width, height)
    const newWidth = Math.max(1, Math.round(width * scale))
    const newHeight = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = newWidth
    canvas.height = newHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    ctx.drawImage(bitmap, 0, 0, newWidth, newHeight)

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return file

    const newName = file.name.replace(/\.[^.]+$/, '.png')
    return new File([blob], newName, { type: 'image/png' })
  } catch {
    return file
  } finally {
    bitmap?.close()
  }
}

/**
 * LogoHeaderPreview - Logo 在列印 Header 內的位置 + 大小編輯器
 *
 * 對應 PrintHeader.tsx 列印頁首實際樣式、所見即所得。
 * 使用者拖動「大小」「水平位置」「垂直位置」滑桿、即時預覽、放開滑桿觸發 auto-save。
 *
 * 規格(對齊 src/lib/print/PrintHeader.tsx 列印實際比例):
 * - Logo base box 120×40 為 100%(scale 1.0)
 * - scale 範圍 0.25-4.0(25%-400%)
 * - offsetX 範圍 -50 到 +600 px
 * - offsetY 範圍 -50 到 +120 px
 */

const LOGO_BASE_WIDTH = 120
const LOGO_BASE_HEIGHT = 40
const SCALE_MIN = 0.25
const SCALE_MAX = 4.0
const OFFSET_X_MIN = -50
const OFFSET_X_MAX = 600
const OFFSET_Y_MIN = -50
const OFFSET_Y_MAX = 120
const HEADER_MIN_HEIGHT = 56

interface LogoHeaderPreviewProps {
  logoUrl: string
  scale: number
  offsetX: number
  offsetY: number
  onScaleChange: (v: number) => void
  onOffsetXChange: (v: number) => void
  onOffsetYChange: (v: number) => void
  /** 滑桿釋放時觸發、上層走 PATCH 儲存 */
  onCommit: () => void
  saving?: boolean
}

export function LogoHeaderPreview({
  logoUrl,
  scale,
  offsetX,
  offsetY,
  onScaleChange,
  onOffsetXChange,
  onOffsetYChange,
  onCommit,
  saving = false,
}: LogoHeaderPreviewProps) {
  const t = useTranslations('settingsPage')
  const logoW = LOGO_BASE_WIDTH * scale
  const logoH = LOGO_BASE_HEIGHT * scale

  return (
    <div className="rounded-lg border border-dashed border-morandi-gold/40 bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-morandi-secondary">
          {t('companyLogoPreviewHeaderHint')}(所見即所得、實際列印效果)
        </p>
        {saving && (
          <span className="text-[0.65rem] text-morandi-gold flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            儲存中
          </span>
        )}
      </div>

      {/* 預覽容器:overflow visible 讓 logo 放大時飄出去、不擠壓上下內容(跟列印實際一致) */}
      <div
        className="bg-white border border-border rounded shadow-sm"
        style={{ padding: '20px 24px', overflow: 'visible' }}
      >
        {/* PrintHeader 結構 - 跟 src/lib/print/PrintHeader.tsx 一致、
            高度由標題撐起來、logo absolute 不影響佈局 */}
        <div
          style={{
            position: 'relative',
            paddingBottom: '16px',
            marginBottom: '20px',
            borderBottom: '1px solid #B8A99A',
            minHeight: HEADER_MIN_HEIGHT,
          }}
        >
          {/* Logo - 套用 scale + offsetX + offsetY */}
          <div
            style={{
              position: 'absolute',
              left: `${offsetX}px`,
              top: `${offsetY}px`,
              width: `${logoW}px`,
              height: `${logoH}px`,
            }}
          >
            <img
              src={logoUrl}
              alt="Logo Preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'left top',
              }}
            />
          </div>

          {/* 標題區 - 跟列印實際一致 */}
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div
              style={{
                fontSize: '12px',
                letterSpacing: '3px',
                color: '#B8A99A',
                fontWeight: 500,
                marginBottom: '4px',
              }}
            >
              QUOTATION
            </div>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#3a3633',
                margin: 0,
              }}
            >
              報價單
            </h1>
          </div>
        </div>
        {/* 假文件 - 提供「在 A4 紙上」視覺脈絡 */}
        <div style={{ fontSize: '11px', color: '#9CA3AF', lineHeight: 1.8 }}>
          <div>客戶資料 ─────────────────────────────</div>
          <div>行程明細 ─────────────────────────────</div>
          <div>金額合計 ─────────────────────────────</div>
        </div>
      </div>

      {/* 控制 - 三條滑桿 */}
      <div className="space-y-3 pt-1">
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs font-medium text-morandi-primary">大小</Label>
            <span className="text-xs text-morandi-secondary font-mono">
              {Math.round(scale * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={SCALE_MIN}
            max={SCALE_MAX}
            step={0.05}
            value={scale}
            onChange={e => onScaleChange(Number(e.target.value))}
            onMouseUp={onCommit}
            onKeyUp={onCommit}
            onTouchEnd={onCommit}
            disabled={saving}
            className="w-full accent-morandi-gold cursor-pointer disabled:cursor-not-allowed"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-medium text-morandi-primary">水平位置</Label>
              <span className="text-xs text-morandi-secondary font-mono">
                {offsetX >= 0 ? `+${offsetX}` : offsetX} px
              </span>
            </div>
            <input
              type="range"
              min={OFFSET_X_MIN}
              max={OFFSET_X_MAX}
              step={2}
              value={offsetX}
              onChange={e => onOffsetXChange(Number(e.target.value))}
              onMouseUp={onCommit}
              onKeyUp={onCommit}
              onTouchEnd={onCommit}
              disabled={saving}
              className="w-full accent-morandi-gold cursor-pointer disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-medium text-morandi-primary">垂直位置</Label>
              <span className="text-xs text-morandi-secondary font-mono">
                {offsetY >= 0 ? `+${offsetY}` : offsetY} px
              </span>
            </div>
            <input
              type="range"
              min={OFFSET_Y_MIN}
              max={OFFSET_Y_MAX}
              step={2}
              value={offsetY}
              onChange={e => onOffsetYChange(Number(e.target.value))}
              onMouseUp={onCommit}
              onKeyUp={onCommit}
              onTouchEnd={onCommit}
              disabled={saving}
              className="w-full accent-morandi-gold cursor-pointer disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// CropDialog — 章子 / Logo 上傳後的裁框 dialog
// 用戶拉框 + 縮放、確認後輸出 cropped PNG（保透明）
// ════════════════════════════════════════════════════════

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(pixelCrop.width)
  canvas.height = Math.round(pixelCrop.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas context not available')
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
}

interface CropDialogProps {
  open: boolean
  imageSrc: string
  onConfirm: (croppedBlob: Blob) => void
  onCancel: () => void
}

function CropDialog({ open, imageSrc, onConfirm, onCancel }: CropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pixelCrop, setPixelCrop] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setPixelCrop(null)
    }
  }, [open, imageSrc])

  const handleConfirm = useCallback(async () => {
    if (!pixelCrop) return
    setProcessing(true)
    try {
      const blob = await getCroppedBlob(imageSrc, pixelCrop)
      onConfirm(blob)
    } catch (e) {
      logger.error('crop failed', e)
      toast.error('裁切失敗、再試一次')
    } finally {
      setProcessing(false)
    }
  }, [imageSrc, pixelCrop, onConfirm])

  return (
    <Dialog open={open} onOpenChange={v => !v && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>裁切印章範圍</DialogTitle>
        </DialogHeader>
        <div className="relative w-full bg-muted/30 border border-border rounded-lg" style={{ height: 420 }}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, areaPixels) => setPixelCrop(areaPixels)}
            />
          )}
        </div>
        <div className="px-1">
          <Label className="text-xs text-muted-foreground">縮放</Label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="w-full accent-morandi-gold cursor-pointer"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={processing}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!pixelCrop || processing} variant="soft-gold">
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : '確定裁切'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ImageUploadFieldProps {
  label: string
  hint: string
  value: string
  onChange: (url: string) => void
  fieldName: string
  workspaceId: string
}

export function ImageUploadField({
  label,
  hint,
  value,
  onChange,
  fieldName,
  workspaceId,
}: ImageUploadFieldProps) {
  const t = useTranslations('settingsPage')
  const [uploading, setUploading] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 上傳到 storage、回傳 publicUrl
  const uploadToStorage = useCallback(
    async (file: File): Promise<void> => {
      setUploading(true)
      try {
        // 前端 resize:保比例、最長邊 800px、輸出 PNG 保透明
        const resized = await resizeImage(file)

        // 走 /api/storage/upload(admin client 繞 storage.objects RLS)
        const ext = resized.name.split('.').pop()
        const fileName = `${workspaceId}/${fieldName}-${Date.now()}.${ext}`
        const fd = new FormData()
        fd.append('file', resized)
        fd.append('bucket', STORAGE_BUCKET)
        fd.append('path', fileName)

        const res = await fetch('/api/storage/upload', { method: 'POST', body: fd })
        const json = (await res.json()) as { data?: { publicUrl?: string }; message?: string }
        if (!res.ok || !json.data?.publicUrl) {
          throw new Error(json.message || '上傳失敗')
        }

        onChange(json.data.publicUrl)
      } catch (error) {
        logger.error(`${t('companyUploadFailed')}:`, error)
        toast.error(t('companyUploadFailed'))
      } finally {
        setUploading(false)
      }
    },
    [workspaceId, fieldName, onChange, t]
  )

  // 選 file → 先開 crop dialog、確認後才 upload
  const handleFileSelect = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(t('companyUnsupportedFormat'))
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t('companyFileTooLarge'))
        return
      }
      const url = URL.createObjectURL(file)
      setCropSrc(url)
    },
    [t]
  )

  // 重新裁切：把既有 URL 載回 → 開 dialog
  const handleRecrop = useCallback(() => {
    if (!value) return
    setCropSrc(value)
  }, [value])

  const handleCropConfirm = useCallback(
    async (blob: Blob) => {
      const cropped = new File([blob], `${fieldName}-cropped.png`, { type: 'image/png' })
      // 釋放 ObjectURL（如果是上傳產生的）
      if (cropSrc && cropSrc.startsWith('blob:')) {
        URL.revokeObjectURL(cropSrc)
      }
      setCropSrc(null)
      await uploadToStorage(cropped)
    },
    [cropSrc, fieldName, uploadToStorage]
  )

  const handleCropCancel = useCallback(() => {
    if (cropSrc && cropSrc.startsWith('blob:')) {
      URL.revokeObjectURL(cropSrc)
    }
    setCropSrc(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [cropSrc])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  return (
    <div>
      <Label className="text-sm font-medium text-morandi-primary mb-1 block">{label}</Label>
      {hint && <p className="text-xs text-morandi-secondary mb-2">{hint}</p>}

      {value ? (
        <div className="relative inline-block group">
          <img
            src={value}
            alt={label}
            className="max-h-24 rounded-lg border border-border object-contain bg-card p-2"
          />
          <button
            type="button"
            onClick={handleRecrop}
            className="absolute -top-2 -left-2 bg-morandi-gold text-white rounded-full p-1 hover:bg-morandi-gold/80 transition-colors opacity-0 group-hover:opacity-100"
            title="重新裁切"
          >
            <CropIcon className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 bg-morandi-red text-white rounded-full p-1 hover:bg-morandi-red/80 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer',
            'hover:border-morandi-gold/50 hover:bg-morandi-gold/5 transition-colors',
            uploading && 'pointer-events-none opacity-60'
          )}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 mx-auto text-morandi-gold animate-spin" />
          ) : (
            <>
              <Upload className="h-6 w-6 mx-auto text-morandi-secondary mb-1" />
              <p className="text-xs text-morandi-secondary">{t('companyClickToUpload')}</p>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
      <CropDialog
        open={!!cropSrc}
        imageSrc={cropSrc || ''}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    </div>
  )
}
