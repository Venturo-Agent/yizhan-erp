'use client'

import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SignaturePad } from '@/components/ui/signature-pad'

const PAGE_LABELS = {
  BACK_TO_CONTRACT: '← 返回合約',
  ELECTRONIC_SIGN_TITLE: '電子簽署',
  SIGNING: '簽署中...',
  CONFIRM_YOUR_SIGNATURE: '請確認您的簽名：',
  RETRY_SIGN: '重新簽名',
  CONFIRM_SUBMIT: '確認提交',
  SIGN_RECORD_NOTE: '簽署後將記錄您的 IP 位址及時間戳記，作為簽署證明',
} as const

interface ContractSignStepProps {
  templateLabel: string
  tourName: string
  signerName: string
  companyName?: string
  signerType: string
  memberCount: number
  signatureWidth: number
  signing: boolean
  signaturePreview: string | null
  error: string | null
  onBack: () => void
  onSignatureCapture: (dataUrl: string) => void
  onRetrySign: () => void
  onConfirmSign: () => void
}

export function ContractSignStep({
  templateLabel,
  tourName,
  signerName,
  companyName,
  signerType,
  memberCount,
  signatureWidth,
  signing,
  signaturePreview,
  error,
  onBack,
  onSignatureCapture,
  onRetrySign,
  onConfirmSign,
}: ContractSignStepProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-morandi-gold/10 to-card flex flex-col">
      {/* 頂部 */}
      <div className="bg-card border-b border-border px-4 py-4">
        <div className="max-w-md mx-auto flex items-center">
          <button onClick={onBack} className="text-morandi-muted hover:text-morandi-primary mr-4">
            {PAGE_LABELS.BACK_TO_CONTRACT}
          </button>
          <h1 className="text-lg font-semibold text-morandi-primary">
            {PAGE_LABELS.ELECTRONIC_SIGN_TITLE}
          </h1>
        </div>
      </div>

      {/* 簽名區 */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-lg p-6 w-full max-w-md">
          {/* 合約摘要 */}
          <div className="mb-6 pb-6 border-b border-border">
            <div className="text-sm text-morandi-muted mb-1">{templateLabel}</div>
            <div className="font-semibold text-morandi-primary">{tourName}</div>
            <div className="text-sm text-morandi-secondary mt-1">
              簽約人：
              {signerType === 'company' ? companyName : signerName}
              {memberCount > 1 && ` 等 ${memberCount} 人`}
            </div>
          </div>

          {/* 簽名板或預覽 */}
          {signing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-morandi-gold mb-4" />
              <p className="text-morandi-secondary">{PAGE_LABELS.SIGNING}</p>
            </div>
          ) : signaturePreview ? (
            // 簽名預覽
            <div className="space-y-4">
              <div className="text-sm text-morandi-secondary text-center">
                {PAGE_LABELS.CONFIRM_YOUR_SIGNATURE}
              </div>
              <div className="border-2 border-status-warning/30 rounded-lg p-4 bg-status-warning-bg">
                <img
                  src={signaturePreview}
                  alt="簽名預覽"
                  className="mx-auto"
                  style={{ maxWidth: signatureWidth, height: 180 }}
                />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="soft-gold" className="flex-1" onClick={onRetrySign}>
                  {PAGE_LABELS.RETRY_SIGN}
                </Button>
                <Button type="button" className="flex-1" onClick={onConfirmSign}>
                  <Check className="w-4 h-4 mr-1" />
                  {PAGE_LABELS.CONFIRM_SUBMIT}
                </Button>
              </div>
            </div>
          ) : (
            // 簽名板
            <SignaturePad onSave={onSignatureCapture} width={signatureWidth} height={180} />
          )}

          {error && (
            <div className="mt-4 p-3 bg-morandi-red/10 text-morandi-red rounded-lg text-sm">
              {error}
            </div>
          )}

          <p className="text-xs text-morandi-muted text-center mt-6">
            {PAGE_LABELS.SIGN_RECORD_NOTE}
          </p>
        </div>
      </div>
    </div>
  )
}
