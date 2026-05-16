'use client'

/**
 * 拜訪錄音上傳區塊
 *
 * uploading 狀態透過 onUploadingChange 回報給父層、讓父層合併進 isBusy
 */

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Loader2, Upload, X, Sparkles, FileAudio, Mic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { uploadVisitAudio } from '@/lib/cis/audio-upload'

const WORKSPACE_NOT_FOUND_MSG = '找不到 workspace context、請重新登入'

interface CisVisitAudioSectionProps {
  clientId: string
  visitId: string | null
  audioUrl: string
  disabled: boolean
  onAudioChange: (url: string) => void
  onUploadingChange: (uploading: boolean) => void
}

export function CisVisitAudioSection({
  clientId,
  visitId,
  audioUrl,
  disabled,
  onAudioChange,
  onUploadingChange,
}: CisVisitAudioSectionProps) {
  const t = useTranslations('cis')
  const user = useAuthStore(s => s.user)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFilePick = () => fileInputRef.current?.click()

  const handleRemoveAudio = () => {
    onAudioChange('')
  }

  const handleTranscribe = () => {
    toast(t('audioToastTranscribePending'), { duration: 5000 })
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('audio/')) {
      toast.error(t('audioInvalidType'))
      return
    }
    if (!user?.workspace_id) {
      toast.error(WORKSPACE_NOT_FOUND_MSG)
      return
    }

    setUploading(true)
    onUploadingChange(true)
    try {
      const result = await uploadVisitAudio({
        workspaceId: user.workspace_id,
        clientId,
        visitId,
        file,
      })
      if (!result.ok) {
        toast.error(`${t('audioToastUploadFailed')}：${result.error}`)
        return
      }
      onAudioChange(result.publicUrl)
      toast.success(t('audioToastUploadSuccess'))
    } finally {
      setUploading(false)
      onUploadingChange(false)
    }
  }

  const isBusy = disabled || uploading

  return (
    <section className="rounded-md border border-morandi-muted/20 bg-morandi-muted/5 p-3 grid gap-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-semibold text-morandi-primary">
          <Mic size={14} />
          拜訪錄音
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {!audioUrl && (
            <Button
              type="button"
              variant="soft-gold"
              size="sm"
              onClick={handleFilePick}
              disabled={isBusy}
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Upload size={14} className="mr-1" />
              )}
              {uploading ? t('audioBtnUploading') : t('audioBtnUpload')}
            </Button>
          )}
          {audioUrl && (
            <>
              <Button
                type="button"
                variant="soft-gold"
                size="sm"
                onClick={handleTranscribe}
                disabled={isBusy}
              >
                <Sparkles size={14} className="mr-1" />
                {t('audioBtnTranscribe')}
              </Button>
              <Button
                type="button"
                variant="soft-gold"
                size="sm"
                onClick={handleRemoveAudio}
                disabled={isBusy}
              >
                <X size={14} className="mr-1" />
                {t('audioBtnRemove')}
              </Button>
            </>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleUpload}
      />

      {audioUrl && (
        <div className="flex items-center gap-2 text-xs text-morandi-secondary">
          <FileAudio size={14} className="shrink-0" />
          <audio src={audioUrl} controls className="flex-1 max-w-md" preload="none" />
        </div>
      )}
    </section>
  )
}
