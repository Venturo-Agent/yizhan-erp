'use client'

/**
 * InstagramSetupSteps — Instagram DM Setup Wizard 各步驟 UI 子組件
 * 從 InstagramSetup.tsx 拆分出來，保持主組件在 500 行以內
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Instagram, Check, Copy, Loader2, AlertCircle, ExternalLink, Sparkles } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

// ─────────────────────────────────────────────────────────────────────────────
// 共用型別（供主組件 import 使用）
// ─────────────────────────────────────────────────────────────────────────────

export interface IgInfo {
  igBusinessAccountId: string
  igUsername: string
  igName?: string
  linkedFbPageId?: string
  pictureUrl?: string
}

export interface ProvisionResult {
  webhookUrl: string
  webhookVerifyToken: string
  igBusinessAccountId: string
  igUsername: string
  botEmployeeId: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Welcome 介紹
// ─────────────────────────────────────────────────────────────────────────────
export function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
          <Instagram className="w-6 h-6 text-morandi-gold" />
          開通 Instagram DM 整合
        </h2>
        <p className="text-sm text-morandi-secondary">
          客戶從 IG DM 跟 AI bot 對話、自動建單。預計 10-15 分鐘完成（IG 設定門檻比 FB 高）。
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">你需要先準備（缺一不可）</h3>
        <ol className="list-decimal list-inside text-sm space-y-2 text-morandi-secondary">
          <li>
            一個 <strong>FB Business Page</strong>（IG Business 必須綁定 FB Page）
          </li>
          <li>
            把你的 IG 帳號切換為 <strong>Business / Creator</strong> account
          </li>
          <li>
            在 IG App → 設定 → 商業中心 → 連接 FB Page
          </li>
          <li>
            在 Meta App（同 FB Messenger 用的那個）加上 Messenger 跟 Instagram product、勾選
            <code className="px-1 bg-morandi-container/30 rounded mx-1">instagram_basic</code>+
            <code className="px-1 bg-morandi-container/30 rounded mx-1">instagram_manage_messages</code>權限
          </li>
          <li>
            產生 <strong>Page Access Token</strong>（跟 FB Messenger 同一個 token、IG 透過 FB Page 操作）
          </li>
          <li>
            到{' '}
            <a
              href="https://developers.facebook.com/tools/explorer/"
              target="_blank"
              rel="noreferrer"
              className="text-morandi-gold hover:underline mx-1 inline-flex items-center gap-1"
            >
              Graph API Explorer <ExternalLink className="w-3 h-3" />
            </a>
            查你的 <strong>IG Business Account ID</strong>（GET /me?fields=instagram_business_account）
          </li>
        </ol>
      </div>

      <div className="rounded-md bg-morandi-gold/10 border border-morandi-gold/30 p-4 text-sm text-morandi-secondary">
        <strong className="text-morandi-primary">關於資料安全</strong>
        <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
          <li>token 用 AES-256-GCM 加密寫進 DB、跟 FB 設定獨立儲存</li>
          <li>master key 在 server env、跟 DB 隔離</li>
        </ul>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext}>下一步：填資料</Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Credentials
// ─────────────────────────────────────────────────────────────────────────────
export function StepCredentials({
  credentials,
  onChange,
  onBack,
  onValidate,
  validating,
  error,
}: {
  credentials: {
    page_access_token: string
    ig_business_account_id: string
    app_secret: string
    bot_greeting: string
  }
  onChange: (
    k: 'page_access_token' | 'ig_business_account_id' | 'app_secret' | 'bot_greeting',
    v: string
  ) => void
  onBack: () => void
  onValidate: () => void
  validating: boolean
  error: string | null
}) {
  const canValidate =
    credentials.page_access_token.trim().length > 0 &&
    credentials.ig_business_account_id.trim().length > 0

  const [autoDetecting, setAutoDetecting] = useState(false)
  const [autoDetectInfo, setAutoDetectInfo] = useState<{ name: string | null; username: string | null } | null>(null)

  const handleAutoDetect = async () => {
    setAutoDetecting(true)
    try {
      const res = await fetch('/api/instagram/setup/lookup-from-fb', { method: 'GET' })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error('自動偵測失敗', { description: json.error || '請手動填 IG Business Account ID' })
        return
      }
      const data = json.data as {
        igBusinessAccountId: string
        igUsername: string | null
        igName: string | null
      }
      onChange('ig_business_account_id', data.igBusinessAccountId)
      setAutoDetectInfo({ name: data.igName, username: data.igUsername })
      toast.success(`偵測到 IG 帳號：${data.igName || data.igUsername || data.igBusinessAccountId}`)
    } catch (e) {
      logger.error('IG auto detect failed', e)
      toast.error('自動偵測失敗', { description: e instanceof Error ? e.message : '請手動填' })
    } finally {
      setAutoDetecting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold mb-1">填 IG Business Account 資料</h2>
        <p className="text-xs text-morandi-secondary">
          token 用 FB Page Access Token（IG 透過綁定的 FB Page 操作）、ID 是 IG Business Account ID。
        </p>
      </div>

      {/* 一鍵從已開通 FB Page 自動偵測 IG */}
      <div className="rounded-md border border-morandi-gold/30 bg-morandi-gold/5 p-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-morandi-primary">
              <Sparkles className="w-4 h-4 text-morandi-gold" />
              從已開通的 FB Page 自動偵測 IG
            </div>
            <p className="text-[0.7rem] text-morandi-secondary mt-1">
              不用跑 Graph API Explorer 找 IG Business Account ID、用已存的 FB Page Token 自動反查。前提：FB Messenger 已開通 + IG 帳號已連結該 FB Page。
            </p>
            {autoDetectInfo && (
              <p className="text-xs text-morandi-green mt-2 flex items-center gap-1">
                <Check className="w-3 h-3" />
                偵測到：{autoDetectInfo.name || autoDetectInfo.username || '(已填入 ID)'}
              </p>
            )}
          </div>
          <Button
            variant="soft-gold"
            size="sm"
            onClick={handleAutoDetect}
            disabled={autoDetecting}
            className="shrink-0"
          >
            {autoDetecting ? <Loader2 className="w-3 h-3 animate-spin" /> : '自動偵測'}
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase">Page Access Token *</Label>
        <Input
          type="text"
          value={credentials.page_access_token}
          onChange={e => onChange('page_access_token', e.target.value)}
          placeholder="EAAxxxxx... 跟 FB Messenger 同一個 token"
          className="font-mono text-xs"
        />
        <p className="text-[0.647rem] text-morandi-muted">
          已開通 FB Messenger 的話、用同一個 token 即可
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase">IG Business Account ID *</Label>
        <Input
          type="text"
          value={credentials.ig_business_account_id}
          onChange={e => onChange('ig_business_account_id', e.target.value)}
          placeholder="17841xxxxxxxxx（純數字、IG Business 內部 ID）"
          className="font-mono text-xs"
        />
        <p className="text-[0.647rem] text-morandi-muted">
          Graph API Explorer 跑 GET /me?fields=instagram_business_account 拿
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase">App Secret（可選）</Label>
        <Input
          type="text"
          value={credentials.app_secret}
          onChange={e => onChange('app_secret', e.target.value)}
          placeholder="App settings → Basic → App Secret"
          className="font-mono text-xs"
        />
        <p className="text-[0.647rem] text-morandi-muted">用於驗 webhook 簽章、可暫時跳過</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase">機器人開場白（可選）</Label>
        <Textarea
          value={credentials.bot_greeting}
          onChange={e => onChange('bot_greeting', e.target.value)}
          placeholder="例：嗨～想出國玩跟我說團名跟人數就好"
          rows={2}
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={validating}>
          上一步
        </Button>
        <Button onClick={onValidate} disabled={!canValidate || validating}>
          {validating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              驗證中...
            </>
          ) : (
            '驗證 token'
          )}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Validate 確認 IG Business info、確認後跑 provision
// ─────────────────────────────────────────────────────────────────────────────
export function StepValidateConfirm({
  igInfo,
  onBack,
  onProvision,
  provisioning,
  error,
}: {
  igInfo: IgInfo
  onBack: () => void
  onProvision: () => void
  provisioning: boolean
  error: string | null
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold mb-1">確認連到的 IG Business</h2>
        <p className="text-xs text-morandi-secondary">
          token 跟 IG Business ID 配對通過、確認下方資訊是你要的帳號。
        </p>
      </div>

      <div className="rounded-md border border-morandi-gold/40 bg-morandi-gold/5 p-5 flex items-center gap-4">
        {igInfo.pictureUrl ? (
          <img
            src={igInfo.pictureUrl}
            alt={igInfo.igUsername}
            className="w-16 h-16 rounded-xl object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-morandi-gold/20 flex items-center justify-center">
            <Instagram className="w-8 h-8 text-morandi-gold" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg">@{igInfo.igUsername}</h3>
          {igInfo.igName && (
            <p className="text-xs text-morandi-secondary">{igInfo.igName}</p>
          )}
          <p className="text-[0.647rem] text-morandi-muted font-mono mt-1">
            IG Business ID: {igInfo.igBusinessAccountId}
          </p>
          {igInfo.linkedFbPageId && (
            <p className="text-[0.647rem] text-morandi-muted font-mono">
              綁定 FB Page: {igInfo.linkedFbPageId}
            </p>
          )}
        </div>
        <Check className="w-6 h-6 text-green-600 flex-shrink-0" />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={provisioning}>
          上一步
        </Button>
        <Button onClick={onProvision} disabled={provisioning}>
          {provisioning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              開通中...
            </>
          ) : (
            '確認開通'
          )}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5: Done 顯示 webhook URL + verify token + 教學
// ─────────────────────────────────────────────────────────────────────────────
export function StepDone({
  webhookUrl,
  webhookVerifyToken,
  igUsername,
  onCopy,
}: {
  webhookUrl: string
  webhookVerifyToken: string
  igUsername: string
  onCopy: (text: string, label: string) => void
}) {
  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-600">
          <Check className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold">IG DM 開通成功</h2>
        <p className="text-sm text-morandi-secondary">
          已加密儲存 token、@{igUsername} 的設定已就位。
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase">Callback URL（複製這個）</Label>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={webhookUrl}
            className="font-mono text-xs bg-morandi-container/20"
            onFocus={e => e.target.select()}
          />
          <Button onClick={() => onCopy(webhookUrl, 'Callback URL')} variant="outline">
            <Copy className="w-4 h-4 mr-2" />
            複製
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase">Verify Token（複製這個）</Label>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={webhookVerifyToken}
            className="font-mono text-xs bg-morandi-container/20"
            onFocus={e => e.target.select()}
          />
          <Button onClick={() => onCopy(webhookVerifyToken, 'Verify Token')} variant="outline">
            <Copy className="w-4 h-4 mr-2" />
            複製
          </Button>
        </div>
      </div>

      <div className="rounded-md bg-morandi-gold/10 border border-morandi-gold/30 p-4 text-sm">
        <strong className="text-morandi-primary">最後一步：在 Meta App 訂閱 Instagram webhook</strong>
        <ol className="list-decimal list-inside mt-2 space-y-1 text-xs text-morandi-secondary">
          <li>
            到{' '}
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noreferrer"
              className="text-morandi-gold hover:underline inline-flex items-center gap-1"
            >
              Meta for Developers Console <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>選你的 App → Instagram → Webhooks（或 Messenger → Webhooks 也行）</li>
          <li>「Callback URL」貼上面那條 URL</li>
          <li>「Verify Token」貼上面那個 Verify Token</li>
          <li>勾選訂閱：messages / messaging_postbacks</li>
          <li>按 Verify and Save、看到 ✓ 就完成</li>
          <li>把 IG Business Account 加進 webhook subscription</li>
        </ol>
      </div>

      <div className="rounded-md border border-morandi-muted/30 p-4 text-xs text-morandi-secondary">
        <strong>怎麼測？</strong> 用個人 IG 帳號傳 DM 給 @{igUsername}、看 bot 是否回應。
      </div>
    </div>
  )
}
