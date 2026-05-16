'use client'

/**
 * /bot/instagram-setup — Instagram DM 自助開通 Setup Wizard
 *
 * 5 step：
 *   1. Welcome 教學（前置條件：FB Business Page + IG Business Account + 已綁定）
 *   2. Credentials 填 page_access_token + ig_business_account_id
 *   3. Validate（call API、回 ig_username / ig_name / linked_fb_page_id）
 *   4. Provisioning（加密寫 DB）
 *   5. WebhookUrl 顯示 webhook URL + verify token
 *
 * 步驟 UI 子組件在 InstagramSetupSteps.tsx。
 *
 * 5/14 移植自 src/app/(main)/bot/instagram-setup/page.tsx、變 component 用在 /ai?tab=setup
 * 原 page.tsx 改 redirect。內部 step / 狀態邏輯不動。
 */

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Instagram, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { SetupWizardLayout } from '@/components/setup/SetupWizardLayout'
import { StepIndicator, type SetupStep } from '@/components/setup/StepIndicator'
import {
  StepWelcome,
  StepCredentials,
  StepValidateConfirm,
  StepDone,
  type IgInfo,
  type ProvisionResult,
} from './InstagramSetupSteps'

type Step = 'welcome' | 'credentials' | 'validate' | 'provision' | 'done'

const IG_SETUP_STEPS: ReadonlyArray<SetupStep<Step>> = [
  { key: 'welcome', label: '介紹' },
  { key: 'credentials', label: '填資料' },
  { key: 'validate', label: '驗證' },
  { key: 'provision', label: '開通中' },
  { key: 'done', label: '完成' },
] as const

export function InstagramSetup() {
  const [step, setStep] = useState<Step>('welcome')
  const [credentials, setCredentials] = useState({
    page_access_token: '',
    ig_business_account_id: '',
    app_secret: '',
    bot_greeting: '',
  })
  const [validating, setValidating] = useState(false)
  const [provisioning, setProvisioning] = useState(false)
  const [igInfo, setIgInfo] = useState<IgInfo | null>(null)
  const [provisionResult, setProvisionResult] = useState<ProvisionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const updateCred = (key: keyof typeof credentials, v: string) => {
    setCredentials(prev => ({ ...prev, [key]: v }))
  }

  const handleValidate = async () => {
    setError(null)
    setValidating(true)
    try {
      const res = await fetch('/api/instagram/setup/validate-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_access_token: credentials.page_access_token,
          ig_business_account_id: credentials.ig_business_account_id,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || `驗證失敗（HTTP ${res.status}）`)
        return
      }
      setIgInfo(json.data as IgInfo)
      setStep('validate')
    } catch (e) {
      logger.error('IG validate failed', e)
      setError(e instanceof Error ? e.message : '無法連 API')
    } finally {
      setValidating(false)
    }
  }

  const handleProvision = async () => {
    setError(null)
    setProvisioning(true)
    setStep('provision')
    try {
      const res = await fetch('/api/instagram/setup/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_access_token: credentials.page_access_token,
          ig_business_account_id: credentials.ig_business_account_id,
          app_secret: credentials.app_secret || null,
          bot_greeting: credentials.bot_greeting || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || `開通失敗（HTTP ${res.status}）`)
        setStep('validate')
        return
      }
      setProvisionResult(json.data as ProvisionResult)
      setStep('done')
      toast.success('IG DM 開通成功')
    } catch (e) {
      logger.error('IG provision failed', e)
      setError(e instanceof Error ? e.message : '無法連 API')
      setStep('validate')
    } finally {
      setProvisioning(false)
    }
  }

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`已複製 ${label}`)
    } catch {
      toast.error('複製失敗、請手動選取')
    }
  }

  return (
    <SetupWizardLayout title="Instagram DM 整合" icon={Instagram}>
      <StepIndicator steps={IG_SETUP_STEPS} current={step} />

      <Card className="p-6">
        {step === 'welcome' && <StepWelcome onNext={() => setStep('credentials')} />}

        {step === 'credentials' && (
          <StepCredentials
            credentials={credentials}
            onChange={updateCred}
            onBack={() => setStep('welcome')}
            onValidate={handleValidate}
            validating={validating}
            error={error}
          />
        )}

        {step === 'validate' && igInfo && (
          <StepValidateConfirm
            igInfo={igInfo}
            onBack={() => {
              setStep('credentials')
              setError(null)
            }}
            onProvision={handleProvision}
            provisioning={provisioning}
            error={error}
          />
        )}

        {step === 'provision' && (
          <div className="text-center py-12 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-morandi-gold" />
            <p className="text-sm font-medium">正在加密儲存、建立 BOT 員工...</p>
            <p className="text-xs text-morandi-secondary">通常 3-5 秒</p>
          </div>
        )}

        {step === 'done' && provisionResult && (
          <StepDone
            webhookUrl={provisionResult.webhookUrl}
            webhookVerifyToken={provisionResult.webhookVerifyToken}
            igUsername={provisionResult.igUsername}
            onCopy={handleCopy}
          />
        )}
      </Card>
    </SetupWizardLayout>
  )
}
