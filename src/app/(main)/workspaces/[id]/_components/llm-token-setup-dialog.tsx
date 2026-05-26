'use client'

/**
 * LLM Token 設定 Dialog（漫途 staff 幫客戶填 LLM 連線設定）
 *
 * 4-step wizard 仿 LineSetupSteps pattern：
 *   1. Provider 選擇
 *   2. Token + Model 輸入
 *   3. 驗證（試打一次 LLM API）
 *   4. 完成（自動關閉 + refresh status）
 *
 * 紀律：
 *   - token 明文絕不入 logger / 不超過必要時間留在 React state
 *   - 送出後立刻清空 token state
 */

import { useState } from 'react'
import { Loader2, CheckSquare, XCircle, Eye, EyeOff } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { apiMutate } from '@/lib/swr/api-mutate'

type Provider = 'minimax' | 'anthropic' | 'openrouter'

const PROVIDER_OPTIONS: Array<{
  value: Provider
  label: string
  description: string
  applyUrl: string
  /** [model_id, 標籤描述] — 第一個是預設 */
  models: Array<[string, string]>
}> = [
  {
    value: 'minimax',
    label: 'MiniMax',
    description: '中國家、繁中表現好、便宜、適合 SaaS 客戶自費（MiniMax 沒有 2.5 版號）',
    applyUrl: 'https://platform.minimaxi.com/',
    models: [
      ['abab5.5s-chat', '💰💰 最便宜舊版、能 work'],
      ['abab6.5s-chat', '💰 便宜、速度快（推薦）'],
      ['abab6.5g-chat', '💰 便宜、支援多模態'],
      ['MiniMax-M2', '🧠 最新思考模型、性價比高'],
      ['MiniMax-M1', '推理版'],
      ['MiniMax-Text-01', '🚀 旗艦、品質最好（要付費 plan）'],
    ],
  },
  {
    value: 'anthropic',
    label: 'Anthropic Claude',
    description: '美國家、品質高、單價較貴',
    applyUrl: 'https://console.anthropic.com/',
    models: [
      ['claude-haiku-4-5', '💰 便宜、適合大量對話（推薦）'],
      ['claude-sonnet-4-5', '⚖️ 平衡型、品質好'],
      ['claude-opus-4-7', '🚀 最強、單價最貴'],
    ],
  },
  {
    value: 'openrouter',
    label: 'OpenRouter',
    description: '統一介面接多家、彈性高',
    applyUrl: 'https://openrouter.ai/',
    models: [
      ['deepseek/deepseek-v3', '💰 超便宜（推薦）'],
      ['minimax/minimax-m2', '💰 MiniMax 便宜版'],
      ['anthropic/claude-haiku-4-5', '💰 Claude Haiku 便宜版'],
      ['google/gemini-2.0-flash-001', '💰 Gemini 便宜版'],
      ['anthropic/claude-sonnet-4-5', '⚖️ 平衡型'],
      ['openai/gpt-4o', '⚖️ 平衡型'],
    ],
  },
]

interface LlmTokenSetupDialogProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

type Step = 1 | 2 | 3 | 4

export function LlmTokenSetupDialog({
  workspaceId,
  open,
  onOpenChange,
  onSaved,
}: LlmTokenSetupDialogProps) {
  const [step, setStep] = useState<Step>(1)
  const [provider, setProvider] = useState<Provider>('minimax')
  const [model, setModel] = useState<string>('abab6.5s-chat')
  const [apiToken, setApiToken] = useState<string>('')
  const [showToken, setShowToken] = useState<boolean>(false)
  const [validating, setValidating] = useState<boolean>(false)
  const [validationResult, setValidationResult] = useState<{
    ok: boolean
    message: string
  } | null>(null)
  const [saving, setSaving] = useState<boolean>(false)

  const providerInfo = PROVIDER_OPTIONS.find(p => p.value === provider)!

  const reset = () => {
    setStep(1)
    setProvider('minimax')
    setModel('abab6.5s-chat')
    setApiToken('')
    setShowToken(false)
    setValidating(false)
    setValidationResult(null)
    setSaving(false)
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const handleProviderChange = (value: string) => {
    const p = value as Provider
    setProvider(p)
    const info = PROVIDER_OPTIONS.find(o => o.value === p)
    if (info && info.models.length > 0) {
      setModel(info.models[0][0])
    }
  }

  const handleValidate = async () => {
    if (!apiToken.trim()) {
      toast.error('請先填 API token')
      return
    }
    setValidating(true)
    setValidationResult(null)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/ai-settings/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model, api_token: apiToken.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.valid) {
        setValidationResult({
          ok: true,
          message: data.sample_response
            ? `驗證成功！LLM 試打回應：「${data.sample_response.slice(0, 80)}...」`
            : '驗證成功',
        })
      } else {
        setValidationResult({
          ok: false,
          message: data.error || '驗證失敗、請檢查 token 跟 model',
        })
      }
    } catch (err) {
      setValidationResult({
        ok: false,
        message: err instanceof Error ? err.message : '網路錯誤',
      })
    } finally {
      setValidating(false)
    }
  }

  const handleSave = async () => {
    if (!validationResult?.ok) {
      toast.error('請先通過驗證')
      return
    }
    setSaving(true)
    // apiMutate：儲存後立即 invalidate ai-settings + status、UI 立刻看到「✅ 已設定」
    const res = await apiMutate<{ error?: string }>(`/api/workspaces/${workspaceId}/ai-settings`, {
      method: 'PUT',
      body: {
        provider,
        model,
        api_token: apiToken.trim(),
        is_active: true,
      },
      invalidate: [
        `/api/workspaces/${workspaceId}/ai-settings`,
        `/api/workspaces/${workspaceId}/ai-settings/status`,
      ],
    })
    setSaving(false)
    if (!res.ok) {
      toast.error('儲存失敗', {
        description: res.error || res.data?.error || '請稍後再試',
      })
      return
    }
    // 立刻清空 token state（不留 closure）
    setApiToken('')
    setStep(4)
    toast.success('LLM 設定已儲存')
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={open => (open ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>LLM Token 設定（{stepLabel(step)}）</DialogTitle>
          <DialogDescription>
            幫此租戶填入 LLM 服務商的 API token、之後該租戶的 AI 對話會用這組憑證跑。
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Provider 選擇 */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <Label className="text-sm font-medium">選擇 LLM 服務商</Label>
            <div className="space-y-2">
              {PROVIDER_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-morandi-cream-soft"
                >
                  <input
                    type="radio"
                    name="provider"
                    value={opt.value}
                    checked={provider === opt.value}
                    onChange={e => handleProviderChange(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-xs text-morandi-secondary">{opt.description}</div>
                    <a
                      href={opt.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-morandi-gold hover:underline mt-1 inline-block"
                    >
                      申請 token →
                    </a>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Token + Model */}
        {step === 2 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">API Token</Label>
              <p className="text-xs text-morandi-secondary">
                從 {providerInfo.label} 後台複製 API key、貼進來。儲存時會加密、永遠不顯示明文。
              </p>
              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  value={apiToken}
                  onChange={e => setApiToken(e.target.value)}
                  placeholder="sk-... / xxxx..."
                  autoComplete="off"
                  spellCheck={false}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-morandi-secondary hover:text-morandi-primary"
                  aria-label={showToken ? '隱藏 token' : '顯示 token'}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Model（模型）</Label>
              <Input
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="model id（可手動輸入、也可從下方常用選項選）"
                className="font-mono text-sm"
              />
              <p className="text-xs text-morandi-secondary">
                可手動輸入任何 {providerInfo.label} 支援的 model
                id。下方是常用選項、點按鈕快速填入：
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {providerInfo.models.map(([modelId, desc]) => (
                  <button
                    key={modelId}
                    type="button"
                    onClick={() => setModel(modelId)}
                    className={`px-2.5 py-1.5 rounded-md text-xs border transition-all ${
                      model === modelId
                        ? 'bg-morandi-gold/20 border-morandi-gold text-morandi-primary'
                        : 'bg-white border-morandi-cream hover:bg-morandi-cream-soft'
                    }`}
                  >
                    <div className="font-mono">{modelId}</div>
                    <div className="text-[0.65rem] text-morandi-secondary mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-morandi-secondary mt-2">
                ⚠️ 注意：每個 token plan 能用的 model 不同、便宜方案通常只能用便宜版（例如 MiniMax
                免費 plan 只支援 abab 系列、不支援 MiniMax-Text-01）。如果驗證失敗訊息提到「your
                current token plan not support model」、換便宜版的 model。
              </p>
            </div>
          </div>
        )}

        {/* Step 3: 驗證 */}
        {step === 3 && (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-4 space-y-2 bg-morandi-cream-soft">
              <div className="text-sm font-medium">即將驗證的設定</div>
              <div className="text-xs space-y-1">
                <div>
                  Provider：<span className="font-mono">{providerInfo.label}</span>
                </div>
                <div>
                  Model：<span className="font-mono">{model}</span>
                </div>
                <div>
                  Token：<span className="font-mono">••••••••（{apiToken.length} 字元）</span>
                </div>
              </div>
            </div>

            {!validationResult && (
              <Button onClick={handleValidate} disabled={validating} className="w-full">
                {validating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    驗證中（試打一次 API）...
                  </>
                ) : (
                  '驗證 token'
                )}
              </Button>
            )}

            {validationResult && (
              <div
                className={`flex items-start gap-2 p-3 rounded-lg ${
                  validationResult.ok
                    ? 'bg-status-success-bg text-status-success border border-status-success/30'
                    : 'bg-status-danger-bg text-status-danger border border-status-danger/30'
                }`}
              >
                {validationResult.ok ? (
                  <CheckSquare className="w-5 h-5 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                )}
                <div className="text-sm">{validationResult.message}</div>
              </div>
            )}

            {validationResult?.ok && (
              <div className="p-3 rounded-lg bg-morandi-gold/10 border-2 border-morandi-gold text-morandi-primary text-sm font-medium">
                ⚠️ 驗證已通、**請繼續點下方「儲存設定」按鈕**才會真的存進 DB。
                直接關閉視窗會**不算完成**、設定不會生效。
              </div>
            )}

            {validationResult && !validationResult.ok && (
              <Button
                variant="outline"
                onClick={() => {
                  setValidationResult(null)
                  setStep(2)
                }}
                className="w-full"
              >
                回上一步重填
              </Button>
            )}
          </div>
        )}

        {/* Step 4: 完成 */}
        {step === 4 && (
          <div className="py-8 text-center space-y-3">
            <CheckSquare className="w-12 h-12 text-status-success mx-auto" />
            <div className="font-medium">LLM 設定完成！</div>
            <div className="text-sm text-morandi-secondary">
              該租戶的 LINE Bot 之後會用 {providerInfo.label} / {model} 回覆。
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button onClick={() => setStep(2)}>下一步</Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                上一步
              </Button>
              <Button onClick={() => setStep(3)} disabled={!apiToken.trim()}>
                下一步
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button variant="outline" onClick={() => setStep(2)}>
                上一步
              </Button>
              <Button
                onClick={handleSave}
                disabled={!validationResult?.ok || saving}
                className={validationResult?.ok ? 'animate-pulse' : ''}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    儲存中
                  </>
                ) : validationResult?.ok ? (
                  '✅ 儲存設定（最後一步）'
                ) : (
                  '儲存設定'
                )}
              </Button>
            </>
          )}
          {step === 4 && (
            <Button onClick={handleClose} className="w-full">
              完成
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function stepLabel(step: Step): string {
  return {
    1: '1/4 選 provider',
    2: '2/4 填 token + model',
    3: '3/4 驗證',
    4: '4/4 完成',
  }[step]
}
