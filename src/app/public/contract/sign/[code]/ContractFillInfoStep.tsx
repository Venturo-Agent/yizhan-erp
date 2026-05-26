'use client'

import { FileSignature } from 'lucide-react'
import { Button } from '@/components/ui/button'

const PAGE_LABELS = {
  BACK_TO_CONTRACT: '← 返回合約',
  CONFIRM_SIGNER_INFO: '確認簽約人資訊',
  LABEL_PHONE: '聯絡電話',
  LABEL_ADDRESS: '住（居）所地址',
  LABEL_ID_NUMBER: '身分證字號（統一編號）',
  PLACEHOLDER_PHONE: '請輸入手機或市話',
  PLACEHOLDER_ADDRESS: '請輸入通訊地址',
  PLACEHOLDER_OPTIONAL: '選填',
  NEXT_STEP_SIGN: '下一步：電子簽名',
  INFO_RECORDED_NOTE: '以上資訊將記載於合約中',
} as const

interface ContractFillInfoStepProps {
  templateLabel: string
  tourName: string
  signerName: string
  memberCount: number
  signerPhone: string
  signerAddress: string
  signerIdNumber: string
  error: string | null
  onPhoneChange: (val: string) => void
  onAddressChange: (val: string) => void
  onIdNumberChange: (val: string) => void
  onBack: () => void
  onNext: () => void
}

export function ContractFillInfoStep({
  templateLabel,
  tourName,
  signerName,
  memberCount,
  signerPhone,
  signerAddress,
  signerIdNumber,
  error,
  onPhoneChange,
  onAddressChange,
  onIdNumberChange,
  onBack,
  onNext,
}: ContractFillInfoStepProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-morandi-gold/10 to-card flex flex-col">
      <div className="bg-card border-b border-border px-4 py-4">
        <div className="max-w-md mx-auto flex items-center">
          <button onClick={onBack} className="text-morandi-muted hover:text-morandi-primary mr-4">
            {PAGE_LABELS.BACK_TO_CONTRACT}
          </button>
          <h1 className="text-lg font-semibold text-morandi-primary">
            {PAGE_LABELS.CONFIRM_SIGNER_INFO}
          </h1>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-lg p-6 w-full max-w-md">
          <div className="mb-6 pb-4 border-b border-border">
            <div className="text-sm text-morandi-muted mb-1">{templateLabel}</div>
            <div className="font-semibold text-morandi-primary">{tourName}</div>
            <div className="text-sm text-morandi-secondary mt-1">
              簽約人：{signerName}
              {memberCount > 1 && ` 等 ${memberCount} 人`}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-morandi-primary mb-1">
                {PAGE_LABELS.LABEL_PHONE} <span className="text-morandi-red">*</span>
              </label>
              <input
                type="tel"
                value={signerPhone}
                onChange={e => onPhoneChange(e.target.value)}
                placeholder={PAGE_LABELS.PLACEHOLDER_PHONE}
                className="w-full px-3 py-2 border border-morandi-muted rounded-lg focus:ring-2 focus:ring-morandi-gold focus:border-morandi-gold outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-morandi-primary mb-1">
                {PAGE_LABELS.LABEL_ADDRESS} <span className="text-morandi-red">*</span>
              </label>
              <input
                type="text"
                value={signerAddress}
                onChange={e => onAddressChange(e.target.value)}
                placeholder={PAGE_LABELS.PLACEHOLDER_ADDRESS}
                className="w-full px-3 py-2 border border-morandi-muted rounded-lg focus:ring-2 focus:ring-morandi-gold focus:border-morandi-gold outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-morandi-primary mb-1">
                {PAGE_LABELS.LABEL_ID_NUMBER}
              </label>
              <input
                type="text"
                value={signerIdNumber}
                onChange={e => onIdNumberChange(e.target.value)}
                placeholder={PAGE_LABELS.PLACEHOLDER_OPTIONAL}
                className="w-full px-3 py-2 border border-morandi-muted rounded-lg focus:ring-2 focus:ring-morandi-gold focus:border-morandi-gold outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-morandi-red/10 text-morandi-red rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="mt-6">
            <Button size="lg" className="w-full" onClick={onNext}>
              <FileSignature className="w-5 h-5 mr-2" />
              {PAGE_LABELS.NEXT_STEP_SIGN}
            </Button>
          </div>

          <p className="text-xs text-morandi-muted text-center mt-4">
            {PAGE_LABELS.INFO_RECORDED_NOTE}
          </p>
        </div>
      </div>
    </div>
  )
}
