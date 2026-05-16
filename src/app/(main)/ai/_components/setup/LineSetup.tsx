'use client'

/**
 * /bot — LINE Bot 自助開通 Setup Wizard（獨立路由、不再夾在設定子頁）
 *
 * 5 step：
 *   1. Welcome 教學
 *   2. Credentials 填三件套（channel_id / access_token / secret）+ greeting
 *   3. Validate（call /api/line/setup/validate-credentials、回 botUserId / displayName）
 *   4. Provisioning（call /api/line/setup/provision、跑 setup pipeline、回 webhook URL）
 *   5. WebhookUrl 顯示 webhook URL 教客戶貼回 LINE Developers
 *
 * 若 workspace 已有 settings、進來直接顯示「已開通」狀態 + 「重新設定」按鈕。
 *
 * 守門：page.tsx ModuleGuard 已守 line_bot module、API 也再守 feature flag。
 *
 * 步驟 UI 子組件在 LineSetupSteps.tsx。
 */

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bot, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { SetupWizardLayout } from '@/components/setup/SetupWizardLayout'
import { StepIndicator, type SetupStep } from '@/components/setup/StepIndicator'
import {
  StepWelcome,
  StepCredentials,
  StepValidateConfirm,
  StepDone,
  type BotInfo,
  type ProvisionResult,
  copyToClipboard,
} from './LineSetupSteps'

// 5/14 移植自 src/app/(main)/bot/setup/page.tsx、變 component 用在 /ai?tab=setup
// 原 page.tsx 改 redirect。內部 step / 狀態邏輯不動。

type Step = 'welcome' | 'credentials' | 'validate' | 'provision' | 'done'

// LINE 嚮導 5 個 step（給 StepIndicator 用）
const LINE_SETUP_STEPS: ReadonlyArray<SetupStep<Step>> = [
  { key: 'welcome', label: '介紹' },
  { key: 'credentials', label: '填資料' },
  { key: 'validate', label: '驗證' },
  { key: 'provision', label: '開通中' },
  { key: 'done', label: '完成' },
] as const

export function LineSetup() {
  const [step, setStep] = useState<Step>('welcome')
  const [credentials, setCredentials] = useState({
    channel_id: '',
    channel_access_token: '',
    channel_secret: '',
    bot_greeting: '',
  })
  const [validating, setValidating] = useState(false)
  const [provisioning, setProvisioning] = useState(false)
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null)
  const [provisionResult, setProvisionResult] = useState<ProvisionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [existingActive, setExistingActive] = useState<boolean | null>(null)

  // 進來先檢查 workspace 是不是已開通
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/line/setup/status')
        if (!res.ok) {
          // status 端點還沒做也沒關係、預設沒開通
          if (!cancelled) setExistingActive(false)
          return
        }
        const json = await res.json()
        if (!cancelled) {
          setExistingActive(Boolean(json?.data?.is_active))
        }
      } catch {
        if (!cancelled) setExistingActive(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const updateCred = (key: keyof typeof credentials, v: string) => {
    setCredentials(prev => ({ ...prev, [key]: v }))
  }

  const handleValidate = async () => {
    setError(null)
    setValidating(true)
    try {
      const res = await fetch('/api/line/setup/validate-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_access_token: credentials.channel_access_token }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || `驗證失敗（HTTP ${res.status}）`)
        return
      }
      setBotInfo(json.data as BotInfo)
      setStep('validate')
    } catch (e) {
      logger.error('validate failed', e)
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
      const res = await fetch('/api/line/setup/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: credentials.channel_id,
          channel_access_token: credentials.channel_access_token,
          channel_secret: credentials.channel_secret,
          bot_greeting: credentials.bot_greeting || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || `開通失敗（HTTP ${res.status}）`)
        setStep('validate') // 回上一步、讓客戶重試
        return
      }
      setProvisionResult(json.data as ProvisionResult)
      setStep('done')
      toast.success('LINE Bot 開通成功')
    } catch (e) {
      logger.error('provision failed', e)
      setError(e instanceof Error ? e.message : '無法連 API')
      setStep('validate')
    } finally {
      setProvisioning(false)
    }
  }

  const handleCopyWebhook = () => {
    if (!provisionResult?.webhookUrl) return
    void copyToClipboard(provisionResult.webhookUrl, '已複製 webhook URL')
  }

  // 已開通：顯示「重新設定」入口
  if (existingActive && step === 'welcome') {
    return (
      <SetupWizardLayout title="LINE Bot 整合" icon={Bot}>
        <Card className="p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600">
            <Check className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold">已開通</h2>
          <p className="text-sm text-morandi-secondary">
            此 workspace 的 LINE Bot 已啟用。重新設定會覆蓋目前的 channel 設定。
          </p>
          <Button variant="outline" onClick={() => setExistingActive(false)}>
            重新設定
          </Button>
        </Card>
      </SetupWizardLayout>
    )
  }

  return (
    <SetupWizardLayout title="LINE Bot 整合" icon={Bot}>
      {/* 進度條 */}
      <StepIndicator steps={LINE_SETUP_STEPS} current={step} />

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

          {step === 'validate' && botInfo && (
            <StepValidateConfirm
              botInfo={botInfo}
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
              <p className="text-sm font-medium">正在自動建立 BOT 員工、儲存設定...</p>
              <p className="text-xs text-morandi-secondary">通常 3-5 秒</p>
            </div>
          )}

          {step === 'done' && provisionResult && (
            <StepDone
              webhookUrl={provisionResult.webhookUrl}
              botDisplayName={provisionResult.botDisplayName}
              onCopy={handleCopyWebhook}
            />
          )}
        </Card>
    </SetupWizardLayout>
  )
}
