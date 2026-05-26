'use client'

/**
 * /setup/[token] — Magic Link 公開設定頁
 *
 * 客戶從漫途收到連結 → 直接到此頁、不需要登入、token 是 auth。
 * 流程：
 *   1. 進來先 GET /api/setup-tokens/[token] verify
 *   2. 有效 → 顯示對應 integration 的設定 form + 教學
 *   3. submit → PUT redeem → 顯示成功頁
 *   4. token 失效 / 過期 / 已用 → 顯示對應錯誤訊息
 *
 * 設計：2026-05-14 Logan + William 拍板（telegram message 1050）
 */

import { useEffect, useState, use } from 'react'
import { Loader2, CheckSquare, XCircle, ExternalLink, Lock } from 'lucide-react'

interface VerifyResult {
  valid: boolean
  reason?: 'not_found' | 'expired' | 'used'
  integration_code?: string
  integration_name?: string
  workspace_name?: string
  expires_at?: string
}

interface FieldDef {
  key: string
  label: string
  type: 'text' | 'password' | 'url' | 'checkbox'
  sensitive: boolean
  required: boolean
  placeholder?: string
  hint?: string
}

interface IntegrationFullDef {
  code: string
  name: string
  description: string
  affects: string[]
  fields: FieldDef[]
}

const REASON_LABEL: Record<string, string> = {
  not_found: '此連結無效或已被刪除',
  expired: '此連結已過期',
  used: '此連結已被使用過、每個連結只能用一次',
}

export default function SetupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)

  const [verify, setVerify] = useState<VerifyResult | null>(null)
  const [intDef, setIntDef] = useState<IntegrationFullDef | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})

  // 載入時 verify token + 抓 integration definition
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/setup-tokens/${token}`)
        const data = (await res.json()) as VerifyResult
        if (cancelled) return
        setVerify(data)

        if (data.valid && data.integration_code) {
          // 抓 integration definition（reuse workspace-integrations registry）
          // 註：我們不能直接 expose registry、走 API
          const defRes = await fetch(`/api/integrations/registry?code=${data.integration_code}`)
          if (defRes.ok) {
            const def = (await defRes.json()) as IntegrationFullDef
            if (!cancelled) {
              setIntDef(def)
              // 初始化 formData 為空
              const empty: Record<string, string> = {}
              for (const f of def.fields) empty[f.key] = ''
              setFormData(empty)
            }
          }
        }
      } catch {
        if (!cancelled) setVerify({ valid: false, reason: 'not_found' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  async function handleSubmit() {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/setup-tokens/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: formData }),
      })
      const data = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !data.success) {
        setSubmitError(data.error || '儲存失敗、請聯絡管理員')
        return
      }
      setSubmitted(true)
    } catch {
      setSubmitError('網路錯誤、請稍後重試')
    } finally {
      setSubmitting(false)
    }
  }

  // —— Loading ——
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-morandi-background">
        <div className="flex items-center gap-2 text-morandi-secondary">
          <Loader2 className="animate-spin" size={20} />
          <span>載入中⋯</span>
        </div>
      </div>
    )
  }

  // —— Token 無效 ——
  if (!verify?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-morandi-background px-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-sm p-8 text-center">
          <XCircle size={48} className="mx-auto text-status-danger mb-4" />
          <h1 className="text-xl font-semibold text-morandi-primary mb-2">無法使用此連結</h1>
          <p className="text-morandi-secondary mb-6">
            {REASON_LABEL[verify?.reason || 'not_found']}
          </p>
          <p className="text-sm text-morandi-muted">
            請聯絡發送此連結給您的管理員、請對方重新生成一個新的連結。
          </p>
        </div>
      </div>
    )
  }

  // —— 已 submit 成功 ——
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-morandi-background px-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-sm p-8 text-center">
          <CheckSquare size={48} className="mx-auto text-status-success mb-4" />
          <h1 className="text-xl font-semibold text-morandi-primary mb-2">設定完成 ✓</h1>
          <p className="text-morandi-secondary mb-6">
            {verify.integration_name} 已成功設定到 {verify.workspace_name}。
          </p>
          <p className="text-sm text-morandi-muted">您可以關閉此頁面、設定立即生效。</p>
        </div>
      </div>
    )
  }

  // —— 主表單 ——
  if (!intDef) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-morandi-background">
        <Loader2 className="animate-spin text-morandi-secondary" size={20} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-morandi-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-morandi-muted mb-2">
            <Lock size={14} />
            <span>安全的一次性設定連結</span>
          </div>
          <h1 className="text-2xl font-semibold text-morandi-primary">{intDef.name}</h1>
          <p className="text-morandi-secondary mt-2">
            為 <span className="font-medium">{verify.workspace_name}</span> 設定
          </p>
        </div>

        {/* 說明 */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 mb-4">
          <h2 className="font-medium text-morandi-primary mb-2">這是什麼？</h2>
          <p className="text-sm text-morandi-secondary mb-3">{intDef.description}</p>
          {intDef.affects.length > 0 && (
            <>
              <p className="text-xs text-morandi-muted mb-1">影響的功能：</p>
              <ul className="text-xs text-morandi-secondary space-y-0.5">
                {intDef.affects.map(f => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* 表單 */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 mb-4">
          <h2 className="font-medium text-morandi-primary mb-4">填入您申請的 API 設定</h2>
          <div className="space-y-4">
            {intDef.fields.map(field => {
              // Checkbox
              if (field.type === 'checkbox') {
                const isChecked = formData[field.key] === 'true'
                return (
                  <div key={field.key} className="space-y-1">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            [field.key]: e.target.checked ? 'true' : 'false',
                          }))
                        }
                        className="w-4 h-4 rounded border-border"
                      />
                      <span className="text-sm font-medium text-morandi-primary">
                        {field.label}
                        {field.required && <span className="text-status-danger ml-1">*</span>}
                      </span>
                    </label>
                    {field.hint && <p className="text-xs text-morandi-muted ml-7">{field.hint}</p>}
                  </div>
                )
              }

              // Text / password / url
              return (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-morandi-primary mb-1">
                    {field.label}
                    {field.required && <span className="text-status-danger ml-1">*</span>}
                  </label>
                  <input
                    type={field.type === 'password' ? 'password' : 'text'}
                    value={formData[field.key] || ''}
                    onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-morandi-gold"
                  />
                  {field.hint && <p className="text-xs text-morandi-muted mt-1">{field.hint}</p>}
                </div>
              )
            })}
          </div>
        </div>

        {/* 提交 */}
        {submitError && (
          <div className="bg-status-danger/10 border border-status-danger/30 rounded-lg p-3 mb-4 text-sm text-status-danger">
            {submitError}
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 bg-morandi-gold text-white font-medium rounded-lg hover:bg-morandi-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              儲存中⋯
            </span>
          ) : (
            '儲存設定'
          )}
        </button>

        <p className="text-xs text-morandi-muted text-center mt-4">
          您填的 API key 會經過 AES-256-GCM 加密後存入資料庫、漫途員工也無法看到明文。
          <br />
          此連結為一次性使用、儲存成功後即失效。
        </p>
      </div>
    </div>
  )
}
