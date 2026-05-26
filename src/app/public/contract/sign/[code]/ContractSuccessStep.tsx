'use client'

import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

const PAGE_LABELS = {
  SIGN_COMPLETE: '簽署完成！',
  BACK_TO_HOME: '回到首頁',
  VIEW_CONTRACT: '查看合約',
} as const

interface ContractSuccessStepProps {
  contractCode: string
  onBackToHome: () => void
  onViewContract: () => void
}

export function ContractSuccessStep({
  contractCode,
  onBackToHome,
  onViewContract,
}: ContractSuccessStepProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-morandi-green/10 to-card flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-lg p-8 max-w-md text-center">
        <div className="w-20 h-20 bg-morandi-green/15 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-morandi-green" />
        </div>
        <h1 className="text-2xl font-bold text-morandi-primary mb-2">
          {PAGE_LABELS.SIGN_COMPLETE}
        </h1>
        <p className="text-morandi-secondary mb-6">
          您的電子簽名已成功提交。
          <br />
          旅行社將會收到通知。
        </p>
        <div className="text-sm text-morandi-muted mb-6">
          合約編號：{contractCode}
          <br />
          簽署時間：{new Date().toLocaleString('zh-TW')}
        </div>

        {/* 導航按鈕 */}
        <div className="flex flex-col gap-3">
          <Button size="lg" onClick={onBackToHome}>
            {PAGE_LABELS.BACK_TO_HOME}
          </Button>
          <Button size="lg" variant="soft-gold" onClick={onViewContract}>
            {PAGE_LABELS.VIEW_CONTRACT}
          </Button>
        </div>
      </div>
    </div>
  )
}
