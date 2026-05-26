'use client'

import { useEffect, useRef, useState } from 'react'
import { Shield, Upload, RefreshCw, Check, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { confirm } from '@/lib/ui/alert-dialog'
import { apiGet, apiPost, apiDelete, extractHttpErrorMessage, HttpError } from '@/lib/api/client'
import { parseQrFile } from './amadeus-totp-qr'

const COMPONENT_LABELS = {
  ERR_GENERATE_FAILED: '產生失敗',
  TOAST_NEED_QR_FIRST: '請先上傳 Amadeus QR code',
  TOAST_GENERATE_CODE_FAILED: '產生驗證碼失敗',
  TOAST_COPY_FAILED: '複製失敗',
  CONFIRM_RESET: '確定要清除目前的 Amadeus 驗證設定？',
  TOAST_RESET_DONE: '已清除，請重新上傳 QR code',
  TOAST_RESET_FAILED: '清除失敗',
  ERR_SETUP_FAILED: '設定失敗',
  TOAST_SETUP_DONE: 'Amadeus 驗證設定完成',
  ERR_PARSE_QR: '無法解析 QR code',
  TITLE: 'Amadeus 驗證碼',
  SUBTITLE_FALLBACK: 'Selling Platform 2FA',
  GENERATING: '產生中…',
  CLICK_TO_GENERATE: '點擊產生驗證碼',
  CLICK_TO_COPY: '點擊複製',
  COPIED: '已複製',
  CLICK_NUMBER_COPY_PREFIX: '點擊數字複製 · ',
  EXPIRED_HINT: '已過期 · 點擊重新產生',
  PARSING: '解析中…',
  UPLOAD_QR: '上傳 QR code',
  RESET: '重新設定',
  COPY_CODE: '複製驗證碼',
  DROP_OR_CLICK: '拖入或點擊上傳 QR code',
  GOOGLE_AUTH_HINT: 'Google Authenticator 匯出截圖',
} as const

interface CurrentResponse {
  configured: boolean
  code?: string
  remaining?: number
  accountName?: string | null
}

type ViewState = 'idle' | 'setup' | 'active' | 'expired'

export function AmadeusTotpWidget() {
  // 零載入：不查 API，直接進 idle 狀態（按按鈕才知道有沒有設定）
  const [view, setView] = useState<ViewState>('idle')
  const [code, setCode] = useState<string>('')
  const [remaining, setRemaining] = useState<number>(0)
  const [accountName, setAccountName] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const tickTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current)
    }
  }, [])

  const generateCode = async () => {
    setGenerating(true)
    try {
      const data = await apiGet<CurrentResponse>('/api/amadeus-totp/current')
      if (!data.configured || !data.code) {
        toast.info(COMPONENT_LABELS.TOAST_NEED_QR_FIRST)
        setView('setup')
        return
      }
      setCode(data.code)
      setRemaining(data.remaining || 30)
      setAccountName(data.accountName || '')
      setCopied(false)
      setView('active')
    } catch {
      toast.error(COMPONENT_LABELS.TOAST_GENERATE_CODE_FAILED)
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    if (view !== 'active') {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current)
      return
    }
    if (tickTimerRef.current) clearInterval(tickTimerRef.current)
    tickTimerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          setView('expired')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current)
    }
  }, [view])

  const handleCopy = async () => {
    if (view !== 'active' || !code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error(COMPONENT_LABELS.TOAST_COPY_FAILED)
    }
  }

  const handleReset = async () => {
    const confirmed = await confirm(COMPONENT_LABELS.CONFIRM_RESET, {
      title: '重置確認',
      type: 'warning',
    })
    if (!confirmed) return
    try {
      await apiDelete('/api/amadeus-totp')
      toast.success(COMPONENT_LABELS.TOAST_RESET_DONE)
      setView('setup')
      setCode('')
      setAccountName('')
    } catch {
      toast.error(COMPONENT_LABELS.TOAST_RESET_FAILED)
    }
  }

  const handleFile = async (file: File) => {
    setErrorMsg('')
    setUploading(true)
    try {
      const parsed = await parseQrFile(file)
      try {
        await apiPost('/api/amadeus-totp/setup', {
          secret: parsed.secret,
          accountName: parsed.accountName,
        })
      } catch (err) {
        if (err instanceof HttpError) {
          setErrorMsg(extractHttpErrorMessage(err, COMPONENT_LABELS.ERR_SETUP_FAILED))
          return
        }
        throw err
      }
      toast.success(COMPONENT_LABELS.TOAST_SETUP_DONE)
      setAccountName(parsed.accountName || '')
      setView('idle')
    } catch (err) {
      const msg = err instanceof Error ? err.message : COMPONENT_LABELS.ERR_PARSE_QR
      setErrorMsg(msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="h-full">
      <div className="h-full rounded-2xl border border-border/70 shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:border-border/80 bg-gradient-to-br from-muted via-card to-morandi-container/30">
        <div className="p-4 space-y-3 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start gap-2">
            <div
              className={cn(
                'rounded-full p-2 text-white shadow-sm shadow-black/10',
                'bg-gradient-to-br from-morandi-blue/80 to-morandi-blue',
                'ring-1 ring-border/50'
              )}
            >
              <Shield className="w-4 h-4 drop-shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-morandi-primary leading-tight tracking-wide">
                {COMPONENT_LABELS.TITLE}
              </p>
              <p className="text-xs text-morandi-secondary/90 mt-1 truncate">
                {accountName && (view === 'active' || view === 'expired')
                  ? accountName
                  : COMPONENT_LABELS.SUBTITLE_FALLBACK}
              </p>
            </div>
          </div>

          {/* 內容 */}
          <div className="rounded-xl bg-card/70 p-4 shadow-md border border-border/40 flex-1 flex items-center justify-center">
            {view === 'setup' && (
              <SetupPanel
                dragOver={dragOver}
                setDragOver={setDragOver}
                uploading={uploading}
                errorMsg={errorMsg}
                onFile={handleFile}
                onClick={() => fileInputRef.current?.click()}
              />
            )}

            {view === 'idle' && (
              <button
                onClick={generateCode}
                disabled={generating}
                className="group w-full text-center rounded-xl p-2 hover:bg-morandi-blue/5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default"
              >
                <Key className="w-8 h-8 mx-auto text-morandi-muted/60 mb-2 group-hover:text-morandi-blue transition-colors" />
                <p className="text-xs text-morandi-secondary group-hover:text-morandi-blue transition-colors">
                  {generating ? COMPONENT_LABELS.GENERATING : COMPONENT_LABELS.CLICK_TO_GENERATE}
                </p>
              </button>
            )}

            {view === 'active' && (
              <button
                onClick={handleCopy}
                className="group w-full rounded-lg transition-all duration-200 hover:bg-morandi-blue/10 cursor-pointer px-2 py-1"
                title={COMPONENT_LABELS.CLICK_TO_COPY}
              >
                <div className="text-4xl font-mono font-bold text-morandi-blue tracking-[0.3em] tabular-nums select-none">
                  {code.slice(0, 3)} {code.slice(3)}
                </div>
                <div className="mt-3 h-1 rounded-full bg-border/40 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-1000 ease-linear',
                      remaining <= 5 ? 'bg-status-danger' : 'bg-morandi-blue'
                    )}
                    style={{ width: `${(remaining / 30) * 100}%` }}
                  />
                </div>
                <div className="h-4 mt-2 text-xs flex items-center justify-center gap-1">
                  {copied ? (
                    <span className="text-morandi-green flex items-center gap-1">
                      <Check size={12} /> {COMPONENT_LABELS.COPIED}
                    </span>
                  ) : (
                    <span className="text-morandi-muted">
                      {COMPONENT_LABELS.CLICK_NUMBER_COPY_PREFIX}
                      {remaining}s
                    </span>
                  )}
                </div>
              </button>
            )}

            {view === 'expired' && (
              <button
                onClick={generateCode}
                disabled={generating}
                className="group w-full rounded-lg transition-all duration-200 hover:bg-morandi-blue/5 cursor-pointer disabled:opacity-50 px-2 py-1"
              >
                <div className="text-4xl font-mono font-bold text-morandi-muted/40 tracking-[0.3em] tabular-nums select-none">
                  {code.slice(0, 3)} {code.slice(3)}
                </div>
                <div className="mt-3 h-1 rounded-full bg-border/40 overflow-hidden" />
                <div className="h-4 mt-2 text-xs flex items-center justify-center">
                  <span className="text-morandi-muted group-hover:text-morandi-blue transition-colors">
                    {generating ? COMPONENT_LABELS.GENERATING : COMPONENT_LABELS.EXPIRED_HINT}
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* 底部 */}
          <div className="flex gap-3 flex-shrink-0">
            {view === 'setup' && (
              <Button
                variant="soft-gold"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className={cn('flex-1 rounded-xl transition-all duration-200 font-semibold', '')}
              >
                <Upload className="w-4 h-4 mr-1" />
                {uploading ? COMPONENT_LABELS.PARSING : COMPONENT_LABELS.UPLOAD_QR}
              </Button>
            )}
            {(view === 'idle' || view === 'expired') && (
              <Button
                variant="soft-gold"
                size="sm"
                onClick={handleReset}
                className={cn('flex-1 rounded-xl transition-all duration-200 font-semibold', '')}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                {COMPONENT_LABELS.RESET}
              </Button>
            )}
            {view === 'active' && (
              <Button
                variant="soft-gold"
                size="sm"
                onClick={handleCopy}
                className={cn('flex-1 rounded-xl transition-all duration-200 font-semibold', '')}
              >
                <Check className="w-4 h-4 mr-1" />
                {COMPONENT_LABELS.COPY_CODE}
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Setup Panel
// ============================================================================

interface SetupPanelProps {
  dragOver: boolean
  setDragOver: (v: boolean) => void
  uploading: boolean
  errorMsg: string
  onFile: (file: File) => void
  onClick: () => void
}

function SetupPanel({
  dragOver,
  setDragOver,
  uploading,
  errorMsg,
  onFile,
  onClick,
}: SetupPanelProps) {
  return (
    <div className="text-center w-full">
      <div
        onClick={onClick}
        onDragOver={e => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files[0]
          if (f) onFile(f)
        }}
        className={cn(
          'rounded-xl border-2 border-dashed py-4 px-3 cursor-pointer transition-all',
          dragOver
            ? 'border-morandi-blue bg-morandi-blue/10'
            : 'border-border/60 hover:border-morandi-blue/60 hover:bg-morandi-blue/5',
          uploading && 'opacity-50 pointer-events-none'
        )}
      >
        <Upload className="w-6 h-6 mx-auto text-morandi-muted mb-1" />
        <p className="text-xs text-morandi-secondary">{COMPONENT_LABELS.DROP_OR_CLICK}</p>
        <p className="text-[0.588rem] text-morandi-muted mt-1">
          {COMPONENT_LABELS.GOOGLE_AUTH_HINT}
        </p>
      </div>
      {errorMsg && <p className="text-[0.647rem] text-status-danger mt-2">{errorMsg}</p>}
    </div>
  )
}
