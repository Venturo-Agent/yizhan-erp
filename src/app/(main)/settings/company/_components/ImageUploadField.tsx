'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import { useTranslations } from 'next-intl'

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
 * 對應 PrintHeader.tsx 列印頁首實際樣式(包含 QUOTATION 副標、報價單主標、金色分隔線)。
 * 使用者拖動「大小」「水平位置」滑桿、即時預覽、放開滑桿觸發 auto-save。
 *
 * 規格(對齊 src/lib/print/PrintHeader.tsx 列印實際比例):
 * - Logo base box 120×40 為 100%(scale 1.0)
 * - scale 範圍 0.5-2.0(50%-200%)
 * - offsetX 範圍 -50 到 +600 px(Y 軸鎖頂、不允許上下移動)
 * - 預覽容器寬 720px 模擬 A4 列印區、再 scale-down 顯示
 */

// PrintHeader 列印實際寬度約等於 A4 寬 - padding(720px)
const PRINT_AREA_WIDTH = 720
const LOGO_BASE_WIDTH = 120
const LOGO_BASE_HEIGHT = 40
const SCALE_MIN = 0.5
const SCALE_MAX = 2.0
const OFFSET_X_MIN = -50
const OFFSET_X_MAX = 600

interface LogoHeaderPreviewProps {
  logoUrl: string
  scale: number
  offsetX: number
  onScaleChange: (v: number) => void
  onOffsetXChange: (v: number) => void
  /** 滑桿釋放時觸發、上層走 PATCH 儲存 */
  onCommit: () => void
  saving?: boolean
}

export function LogoHeaderPreview({
  logoUrl,
  scale,
  offsetX,
  onScaleChange,
  onOffsetXChange,
  onCommit,
  saving = false,
}: LogoHeaderPreviewProps) {
  const t = useTranslations('settingsPage')
  const logoW = LOGO_BASE_WIDTH * scale
  const logoH = LOGO_BASE_HEIGHT * scale

  return (
    <div className="mt-3 rounded-lg border border-dashed border-morandi-gold/40 bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-morandi-secondary">{t('companyLogoPreviewHeaderHint')}</p>
        {saving && (
          <span className="text-[0.65rem] text-morandi-gold flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            儲存中
          </span>
        )}
      </div>

      {/* 預覽容器:外框比照 A4 列印區寬度、再用 transform: scale 縮小到 viewport 可放 */}
      <div className="overflow-hidden">
        <div
          className="bg-white border border-border rounded shadow-sm origin-top-left"
          style={{
            width: `${PRINT_AREA_WIDTH}px`,
            transform: 'scale(0.62)',
            transformOrigin: 'top left',
            marginBottom: `-${PRINT_AREA_WIDTH * 0.38 * 0.45}px`, // 抵掉 scale 後外圍空白
            padding: '24px 32px',
          }}
        >
          {/* 仿 PrintHeader 結構 */}
          <div
            style={{
              position: 'relative',
              paddingBottom: '16px',
              marginBottom: '24px',
              borderBottom: '1px solid #B8A99A',
              minHeight: Math.max(logoH, 56),
            }}
          >
            {/* Logo - 套用 scale + offsetX */}
            <div
              style={{
                position: 'absolute',
                left: `${offsetX}px`,
                top: 0,
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
          {/* 假文件內容(讓 user 有「在 A4 紙上」的視覺感) */}
          <div style={{ fontSize: '11px', color: '#9CA3AF', lineHeight: 1.8 }}>
            <div>客戶資料 ───────────────────</div>
            <div>行程明細 ───────────────────</div>
            <div>金額合計 ───────────────────</div>
          </div>
        </div>
      </div>

      {/* 控制 - 兩條滑桿 */}
      <div className="space-y-3 pt-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs font-medium text-morandi-primary">
              大小
            </Label>
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
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs font-medium text-morandi-primary">
              水平位置
            </Label>
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
      </div>
    </div>
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
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(t('companyUnsupportedFormat'))
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t('companyFileTooLarge'))
        return
      }

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
        <div className="relative inline-block">
          <img
            src={value}
            alt={label}
            className="max-h-24 rounded-lg border border-border object-contain bg-card p-2"
          />
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
    </div>
  )
}
