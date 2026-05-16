'use client'

/**
 * LineSetupSteps — LINE Bot Setup Wizard 各步驟 UI 子組件
 * 從 LineSetup.tsx 拆分出來，保持主組件在 500 行以內
 */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Bot, Check, Copy, Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

// ─────────────────────────────────────────────────────────────────────────────
// 共用型別（供主組件 import 使用）
// ─────────────────────────────────────────────────────────────────────────────

export interface BotInfo {
  botUserId: string
  basicId: string
  displayName: string
  pictureUrl?: string
}

export interface ProvisionResult {
  webhookUrl: string
  botUserId: string
  botDisplayName: string
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
          <Bot className="w-6 h-6 text-morandi-gold" />
          開通 LINE Bot 客服 / 訂單機器人
        </h2>
        <p className="text-sm text-morandi-secondary">
          開通後、客戶可從你的 LINE 官方帳號（OA）跟 AI bot 對話、自動建單。預計 5 分鐘完成。
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">你需要先準備</h3>
        <ol className="list-decimal list-inside text-sm space-y-2 text-morandi-secondary">
          <li>
            一個 LINE Messaging API 的 Channel（去
            <a
              href="https://developers.line.biz/console/"
              target="_blank"
              rel="noreferrer"
              className="text-morandi-gold hover:underline mx-1 inline-flex items-center gap-1"
            >
              LINE Developers Console <ExternalLink className="w-3 h-3" />
            </a>
            開、不收費）
          </li>
          <li>該 Channel 的 <code className="px-1 bg-morandi-container/30 rounded">Channel ID</code> /
            <code className="px-1 bg-morandi-container/30 rounded">Channel access token</code> /
            <code className="px-1 bg-morandi-container/30 rounded">Channel secret</code>
          </li>
          <li>下一步會教你在哪找這三個值</li>
        </ol>
      </div>

      <div className="rounded-md bg-morandi-gold/10 border border-morandi-gold/30 p-4 text-sm text-morandi-secondary">
        <strong className="text-morandi-primary">關於資料安全</strong>
        <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
          <li>token / secret 只儲存在你的 workspace、其他公司看不到</li>
          <li>機器人建單時會記在 audit log（actor = LINE Bot 系統）</li>
          <li>未來 phase 2 會升級成 vault 加密儲存</li>
        </ul>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext}>下一步：填資料</Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Credentials 填三件套
// ─────────────────────────────────────────────────────────────────────────────
export function StepCredentials({
  credentials,
  onChange,
  onBack,
  onValidate,
  validating,
  error,
}: {
  credentials: { channel_id: string; channel_access_token: string; channel_secret: string; bot_greeting: string }
  onChange: (k: 'channel_id' | 'channel_access_token' | 'channel_secret' | 'bot_greeting', v: string) => void
  onBack: () => void
  onValidate: () => void
  validating: boolean
  error: string | null
}) {
  const canValidate =
    credentials.channel_id.trim().length > 0 &&
    credentials.channel_access_token.trim().length > 0 &&
    credentials.channel_secret.trim().length > 0

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold mb-1">填 LINE Channel 資料</h2>
        <p className="text-xs text-morandi-secondary">
          在 LINE Developers Console → 你的 Channel → 「Basic settings」找 Channel ID 跟 Channel secret、「Messaging API」分頁找 Channel access token（按 Issue 產生）。
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase">Channel ID *</Label>
        <Input
          value={credentials.channel_id}
          onChange={e => onChange('channel_id', e.target.value)}
          placeholder="例：1234567890"
          className="font-mono"
        />
        <p className="text-[0.647rem] text-morandi-muted">在 Basic settings 上方</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase">Channel access token *</Label>
        <Input
          type="text"
          value={credentials.channel_access_token}
          onChange={e => onChange('channel_access_token', e.target.value)}
          placeholder="長一串、180 字左右"
          className="font-mono text-xs"
        />
        <p className="text-[0.647rem] text-morandi-muted">
          Messaging API 分頁 → Channel access token (long-lived) → Issue
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase">Channel secret *</Label>
        <Input
          type="text"
          value={credentials.channel_secret}
          onChange={e => onChange('channel_secret', e.target.value)}
          placeholder="32 個字母數字"
          className="font-mono text-xs"
        />
        <p className="text-[0.647rem] text-morandi-muted">Basic settings 中段、Channel secret</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase">機器人開場白（可選）</Label>
        <Textarea
          value={credentials.bot_greeting}
          onChange={e => onChange('bot_greeting', e.target.value)}
          placeholder="例：您好！我是角落郵輪小幫手、想出國玩跟我說團名跟人數就好"
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
// Step 3: Validate 確認 bot info、確認後跑 provision
// ─────────────────────────────────────────────────────────────────────────────
export function StepValidateConfirm({
  botInfo,
  onBack,
  onProvision,
  provisioning,
  error,
}: {
  botInfo: BotInfo
  onBack: () => void
  onProvision: () => void
  provisioning: boolean
  error: string | null
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold mb-1">確認連到的官方帳號</h2>
        <p className="text-xs text-morandi-secondary">
          token 驗證通過、確認下方資訊是你要的 OA、按「確認開通」會建 BOT 員工 + 儲存設定。
        </p>
      </div>

      <div className="rounded-md border border-morandi-gold/40 bg-morandi-gold/5 p-5 flex items-center gap-4">
        {botInfo.pictureUrl ? (
          <img
            src={botInfo.pictureUrl}
            alt={botInfo.displayName}
            className="w-16 h-16 rounded-xl object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-morandi-gold/20 flex items-center justify-center">
            <Bot className="w-8 h-8 text-morandi-gold" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg">{botInfo.displayName}</h3>
          <p className="text-xs text-morandi-secondary font-mono">{botInfo.basicId}</p>
          <p className="text-[0.647rem] text-morandi-muted font-mono mt-1">
            user ID: {botInfo.botUserId}
          </p>
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
// Step 5: Done 顯示 webhook URL + 教學貼回 LINE
// ─────────────────────────────────────────────────────────────────────────────
export function StepDone({
  webhookUrl,
  botDisplayName,
  onCopy,
}: {
  webhookUrl: string
  botDisplayName: string
  onCopy: () => void
}) {
  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-600">
          <Check className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold">LINE Bot 開通成功</h2>
        <p className="text-sm text-morandi-secondary">
          已建好 BOT 員工、{botDisplayName} 的設定已儲存。
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase">Webhook URL（複製這個）</Label>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={webhookUrl}
            className="font-mono text-xs bg-morandi-container/20"
            onFocus={e => e.target.select()}
          />
          <Button onClick={onCopy} variant="outline">
            <Copy className="w-4 h-4 mr-2" />
            複製
          </Button>
        </div>
      </div>

      <div className="rounded-md bg-morandi-gold/10 border border-morandi-gold/30 p-4 text-sm">
        <strong className="text-morandi-primary">最後一步：在 LINE 那邊設 webhook</strong>
        <ol className="list-decimal list-inside mt-2 space-y-1 text-xs text-morandi-secondary">
          <li>
            到{' '}
            <a
              href="https://developers.line.biz/console/"
              target="_blank"
              rel="noreferrer"
              className="text-morandi-gold hover:underline inline-flex items-center gap-1"
            >
              LINE Developers Console <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>選你的 Channel → Messaging API 分頁</li>
          <li>「Webhook URL」貼上上面那條 URL、按 Update</li>
          <li>按 Verify、看到 Success 就完成</li>
          <li>「Use webhook」打開（toggle on）</li>
          <li>「Auto-reply messages」關掉（不然 bot 跟自動回覆會打架）</li>
        </ol>
      </div>

      <div className="rounded-md border border-morandi-muted/30 p-4 text-xs text-morandi-secondary">
        <strong>怎麼測？</strong> 用手機加你的 LINE OA 為好友、傳「7/8 郵輪」之類的訊息、看 bot 是否回應。
        後台 ERP 訂單頁會看到 sales_person = LINE Bot 系統 的新單。
      </div>
    </div>
  )
}

// 共用錯誤提示組件
export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-red-50 border border-red-200 p-3 flex items-start gap-2">
      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-700">{message}</p>
    </div>
  )
}

// 複製到剪貼板工具函數
export async function copyToClipboard(text: string, successMsg: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(successMsg)
  } catch {
    toast.error('複製失敗、請手動選取')
  }
}
