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
 * LogoHeaderPreview - Logo 在列印 Header 內的即時預覽
 * 規格跟 src/lib/print/PrintHeader.tsx 完全一致(120x40 box、contain、left top)
 */
export function LogoHeaderPreview({ logoUrl }: { logoUrl: string }) {
  const t = useTranslations('settingsPage')
  const boxStyle = (size: number) => ({
    width: `${120 * size}px`,
    height: `${40 * size}px`,
  })
  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
    objectPosition: 'left top' as const,
  }
  return (
    <div className="mt-3 rounded-lg border border-dashed border-morandi-gold/40 bg-card p-3 space-y-3">
      <p className="text-xs text-morandi-secondary">{t('companyLogoPreviewHeaderHint')}</p>
      <div className="flex items-start gap-4 flex-wrap">
        <div>
          <p className="text-[0.588rem] text-morandi-secondary/70 mb-1">
            {t('companyLogoPreviewActualSize')}
          </p>
          <div className="bg-background border border-border rounded p-2 inline-block">
            <div style={boxStyle(1)}>
              <img src={logoUrl} alt={t('companyLogoPreviewActualSize')} style={imgStyle} />
            </div>
          </div>
        </div>
        <div>
          <p className="text-[0.588rem] text-morandi-secondary/70 mb-1">
            {t('companyLogoPreview2x')}
          </p>
          <div className="bg-background border border-border rounded p-2 inline-block">
            <div style={boxStyle(2)}>
              <img src={logoUrl} alt={t('companyLogoPreview2x')} style={imgStyle} />
            </div>
          </div>
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
