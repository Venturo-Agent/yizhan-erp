'use client'

/**
 * FacebookSetupSteps — Facebook Messenger Setup Wizard 各步驟 UI 子組件
 * 從 FacebookSetup.tsx 拆分出來，保持主組件在 500 行以內
 */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Facebook, Check, Copy, Loader2, AlertCircle, ExternalLink } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// 共用型別（供主組件 import 使用）
// ─────────────────────────────────────────────────────────────────────────────

export interface PageInfo {
  pageId: string
  pageName: string
  category?: string
  pictureUrl?: string
}

export interface ProvisionResult {
  webhookUrl: string
  webhookVerifyToken: string
  pageId: string
  pageName: string
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
          <Facebook className="w-6 h-6 text-morandi-gold" />
          開通 Facebook Messenger 整合
        </h2>
        <p className="text-sm text-morandi-secondary">
          開通後、客戶可從你的 FB Page 跟 AI bot 對話、自動建單。預計 5-10 分鐘完成。
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">你需要先準備</h3>
        <ol className="list-decimal list-inside text-sm space-y-2 text-morandi-secondary">
          <li>
            一個{' '}
            <strong>FB Business Page</strong>（用於接收訊息）+{' '}
            <strong>Meta for Developers App</strong>（去
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noreferrer"
              className="text-morandi-gold hover:underline mx-1 inline-flex items-center gap-1"
            >
              Meta for Developers <ExternalLink className="w-3 h-3" />
            </a>
            建一個 type = Business 的 App、不收費）
          </li>
          <li>
            該 App 加上 <strong>Messenger product</strong>、把 FB Page 連進去、產生{' '}
            <code className="px-1 bg-morandi-container/30 rounded">Page Access Token</code>
            （長期版、long-lived）
          </li>
          <li>
            App settings → Basic 拿{' '}
            <code className="px-1 bg-morandi-container/30 rounded">App Secret</code>（驗 webhook 簽章用、可選）
          </li>
          <li>下一步會教你在哪找這些值</li>
        </ol>
      </div>

      <div className="rounded-md bg-morandi-gold/10 border border-morandi-gold/30 p-4 text-sm text-morandi-secondary">
        <strong className="text-morandi-primary">關於資料安全</strong>
        <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
          <li>token / secret 用 AES-256-GCM 加密寫進 DB、漏 DB 也拿不到明文</li>
          <li>master key 在 server env、跟 DB 隔離儲存</li>
          <li>機器人建單時會記在 audit log（actor = FB Messenger 系統）</li>
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
  credentials: { page_access_token: string; app_secret: string; bot_greeting: string }
  onChange: (k: 'page_access_token' | 'app_secret' | 'bot_greeting', v: string) => void
  onBack: () => void
  onValidate: () => void
  validating: boolean
  error: string | null
}) {
  const canValidate = credentials.page_access_token.trim().length > 0

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold mb-1">填 FB App 資料</h2>
        <p className="text-xs text-morandi-secondary">
          在 Meta for Developers Console → 你的 App → Messenger → Settings → Access Tokens、
          選你的 Page、Generate Token（拿到的就是 long-lived Page Access Token）。
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase">Page Access Token *</Label>
        <Input
          type="text"
          value={credentials.page_access_token}
          onChange={e => onChange('page_access_token', e.target.value)}
          placeholder="長字串、EAAxxxxx... 開頭"
          className="font-mono text-xs"
        />
        <p className="text-[0.647rem] text-morandi-muted">
          Messenger → Settings → Access Tokens → 選 Page → Generate Token
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
        <p className="text-[0.647rem] text-morandi-muted">
          用於驗 webhook X-Hub-Signature-256、未來會強制要求、現在可暫時跳過
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase">機器人開場白（可選）</Label>
        <Textarea
          value={credentials.bot_greeting}
          onChange={e => onChange('bot_greeting', e.target.value)}
          placeholder="例：您好！我是漫途旅遊小幫手、想出國玩跟我說團名跟人數就好"
          rows={2}
        />
      </div>

      {error && (
        <div className="rounded-md bg-status-danger-bg border border-status-danger/30 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-status-danger flex-shrink-0 mt-0.5" />
          <p className="text-sm text-status-danger">{error}</p>
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
// Step 3: Validate 確認 Page info、確認後跑 provision
// ─────────────────────────────────────────────────────────────────────────────
export function StepValidateConfirm({
  pageInfo,
  onBack,
  onProvision,
  provisioning,
  error,
}: {
  pageInfo: PageInfo
  onBack: () => void
  onProvision: () => void
  provisioning: boolean
  error: string | null
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold mb-1">確認連到的 FB Page</h2>
        <p className="text-xs text-morandi-secondary">
          token 驗證通過、確認下方資訊是你要的 Page、按「確認開通」會加密儲存 token + 建 BOT 員工。
        </p>
      </div>

      <div className="rounded-md border border-morandi-gold/40 bg-morandi-gold/5 p-5 flex items-center gap-4">
        {pageInfo.pictureUrl ? (
          <img
            src={pageInfo.pictureUrl}
            alt={pageInfo.pageName}
            className="w-16 h-16 rounded-xl object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-morandi-gold/20 flex items-center justify-center">
            <Facebook className="w-8 h-8 text-morandi-gold" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg">{pageInfo.pageName}</h3>
          {pageInfo.category && (
            <p className="text-xs text-morandi-secondary">{pageInfo.category}</p>
          )}
          <p className="text-[0.647rem] text-morandi-muted font-mono mt-1">
            Page ID: {pageInfo.pageId}
          </p>
        </div>
        <Check className="w-6 h-6 text-status-success flex-shrink-0" />
      </div>

      {error && (
        <div className="rounded-md bg-status-danger-bg border border-status-danger/30 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-status-danger flex-shrink-0 mt-0.5" />
          <p className="text-sm text-status-danger">{error}</p>
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
  pageName,
  onCopy,
}: {
  webhookUrl: string
  webhookVerifyToken: string
  pageName: string
  onCopy: (text: string, label: string) => void
}) {
  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-status-success-bg text-status-success">
          <Check className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold">FB Messenger 開通成功</h2>
        <p className="text-sm text-morandi-secondary">
          已加密儲存 token、{pageName} 的設定已就位。
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
        <p className="text-[0.647rem] text-morandi-muted">
          Meta App 訂閱 webhook 時、Verify Token 欄位貼這個（一次性配對用）
        </p>
      </div>

      <div className="rounded-md bg-morandi-gold/10 border border-morandi-gold/30 p-4 text-sm">
        <strong className="text-morandi-primary">最後一步：在 Meta App 訂閱 webhook</strong>
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
          <li>選你的 App → Messenger → Settings → Webhooks</li>
          <li>「Callback URL」貼上面那條 URL</li>
          <li>「Verify Token」貼上面那個 Verify Token</li>
          <li>勾選訂閱 events：messages / messaging_postbacks / messaging_handovers</li>
          <li>按 Verify and Save、看到 ✓ 就完成</li>
          <li>回 Messenger → Settings → 把你的 Page 加進 webhook subscription</li>
        </ol>
      </div>

      <div className="rounded-md border border-morandi-muted/30 p-4 text-xs text-morandi-secondary">
        <strong>怎麼測？</strong> 用個人 FB 帳號傳訊息給你的 Page、看 bot 是否回應。
        後台 ERP 訂單頁會看到 sales_person = FB Messenger 系統 的新單。
      </div>
    </div>
  )
}
