'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import { supabase } from '@/lib/supabase/client'

// localStorage keys
const LAST_CODE_KEY = 'venturo-last-code'
const LAST_EMAIL_KEY = 'venturo-last-email'

export default function LoginPage() {
  const t = useTranslations('login')
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const searchParams = useSearchParams()
  const { validateLogin } = useAuthStore()

  useEffect(() => {
    const lastCode = localStorage.getItem(LAST_CODE_KEY)
    const lastEmail = localStorage.getItem(LAST_EMAIL_KEY)
    if (lastCode) setCode(lastCode)
    if (lastEmail) setEmail(lastEmail)
  }, [])

  useEffect(() => {
    if (searchParams.get('reason') === 'session_expired') {
      setError(t('sessionExpired'))
    }
  }, [searchParams])

  const getRedirectPath = (): string => {
    const redirectParam = searchParams.get('redirect')
    if (redirectParam && redirectParam !== '/login') return redirectParam
    const lastPath = localStorage.getItem('last-visited-path')
    if (lastPath && lastPath !== '/login') return lastPath
    return '/dashboard'
  }

  // 複製分頁 / 多分頁 race rescue：middleware 因 refresh_token 競爭把使用者誤踢來時，
  // client supabase 用 navigator.locks 等另一個 tab 完成 refresh、讀到 valid session 就自動跳回。
  //
  // getSession() 只讀本地快取（不驗 server）、getUser() 才真正問 Supabase server。
  // 必須兩段：快速排除「根本沒 session」→ 再驗 server 避免 admin.updateUserById 後
  // invalidated session 仍在本地快取、觸發誤 redirect 死循環。
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // 第一段：本地快取有沒有 session（無網路開銷）
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (cancelled || !session) return

        // 第二段：向 Supabase server 驗證 session 仍有效
        // （admin.updateUserById 改密後 access/refresh token 全失效、getSession 不知道）
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (cancelled) return
        if (!user) {
          // 本地有 session 但 server 已 invalidate → 清掉防止 redirect 死循環
          await supabase.auth.signOut()
          return
        }

        logger.log('🔄 Login page: detected valid session, auto-redirecting')
        window.location.href = getRedirectPath()
      } catch (e) {
        logger.warn('Login session check failed:', e)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail.trim()) return
    setForgotLoading(true)
    try {
      await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      setForgotSent(true)
    } finally {
      setForgotLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedCode = code.trim().toUpperCase()
    if (!trimmedCode) {
      setError(t('errorEnterCode'))
      return
    }
    if (!email.trim()) {
      setError(t('errorEnterEmail'))
      return
    }

    setIsLoading(true)
    try {
      localStorage.setItem(LAST_CODE_KEY, trimmedCode)
      localStorage.setItem(LAST_EMAIL_KEY, email.trim())

      // 5/15 加 15 秒 timeout：cloudflare tunnel + 遠端網路慢時、validateLogin 可能卡住、
      // user 看到「登入中」轉圈圈永遠不回、體驗極差。Timeout 後給 friendly error。
      const result = await Promise.race([
        validateLogin(email.trim(), password, trimmedCode),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('登入逾時（15 秒無回應）、請檢查網路或聯絡系統管理員')),
            15000
          )
        ),
      ])
      if (result.success) {
        if (result.mustChangePassword) {
          // 首次登入強制改密碼：跳到改密碼頁，改完才能進入系統
          window.location.href = '/change-password?reason=first_login'
        } else {
          window.location.href = getRedirectPath()
        }
      } else {
        setError(result.message || t('errorInvalidCredentials'))
      }
    } catch (error) {
      logger.error('Login error:', error)
      const msg = error instanceof Error ? error.message : ''
      // timeout / network error 顯示具體訊息、不是黑箱「系統錯誤」
      setError(msg.includes('逾時') || msg.includes('network') ? msg : t('errorSystem'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-card to-morandi-container">
      {/* eslint-disable-next-line venturo/no-forbidden-classes */}
      <div className="w-full max-w-[380px] mx-4 bg-gradient-to-t from-white to-morandi-cream rounded-[40px] px-10 py-8 border-[5px] border-white shadow-[rgba(180,160,120,0.45)_0px_30px_30px_-20px]">
        {/* 標題 */}
        <h1 className="text-center font-black text-[1.647rem] tracking-tight text-[var(--morandi-gold)]">
          {t('title')}
        </h1>
        <p className="text-center text-xs text-morandi-muted mt-1">{t('subtitle')}</p>

        {/* 錯誤訊息 */}
        {error && (
          <div className="mt-4 p-3 bg-morandi-red/10 border border-morandi-red/30 rounded-2xl flex items-start gap-2">
            <AlertCircle size={16} className="text-morandi-red mt-0.5 shrink-0" />
            <span className="text-xs text-morandi-red">{error}</span>
          </div>
        )}

        {/* 表單 */}
        <form onSubmit={handleLogin} className="mt-5">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder={t('placeholderCode')}
            required
            autoComplete="organization"
            autoFocus
            className="login-input uppercase"
          />
          <p className="text-[0.647rem] text-morandi-muted mt-1 ml-1">{t('codeHint')}</p>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('placeholderEmail')}
            required
            autoComplete="email"
            inputMode="email"
            className="login-input"
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('placeholderPassword')}
              required
              autoComplete="current-password"
              className="login-input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-morandi-muted hover:text-morandi-secondary mt-[7px]"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* 登入按鈕 — 5/15 拔掉 `!code.trim()` disable 條件
              理由：cloudflare tunnel 給遠端 user 試、disable 狀態 SSR 寫死
              client hydrate 後輸入 code 但 button 仍 disabled、user 點不到。
              改成只在 isLoading 時 disable、缺欄位由 handleLogin 內 validation + setError 處理 */}
          <button type="submit" disabled={isLoading} className="login-button">
            {isLoading ? t('loginButtonLoading') : t('loginButton')}
          </button>
        </form>

        {/* 忘記密碼 */}
        {!showForgot ? (
          <button
            type="button"
            onClick={() => {
              setShowForgot(true)
              setForgotEmail(email)
            }}
            className="mt-4 w-full text-center text-xs text-morandi-muted hover:text-morandi-secondary transition-colors"
          >
            忘記密碼？
          </button>
        ) : (
          <div className="mt-4 border-t border-morandi-gold/20 pt-4">
            {forgotSent ? (
              <p className="text-xs text-center text-morandi-secondary">
                重設信件已寄出，請檢查信箱（含垃圾郵件）。
              </p>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <p className="text-xs text-morandi-secondary mb-2 text-center">
                  輸入帳號 Email，我們會寄重設連結給你
                </p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="帳號 Email"
                  required
                  className="login-input"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setShowForgot(false)}
                    className="flex-1 py-2 text-xs text-morandi-muted border border-morandi-gold/30 rounded-2xl hover:bg-morandi-gold/5"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2 text-xs text-white bg-morandi-gold rounded-2xl disabled:opacity-60"
                  >
                    {forgotLoading ? '寄送中...' : '寄出重設信'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      <style>{`
        .login-input {
          width: 100%;
          background: white;
          border: none;
          padding: 14px 20px;
          border-radius: 20px;
          margin-top: 14px;
          box-shadow: rgba(180, 160, 120, 0.2) 0px 10px 10px -5px;
          border: 2px solid transparent;
          font-size: 14px;
          color: #333;
          outline: none;
          transition: border-color 0.2s;
        }
        .login-input::placeholder {
          color: #aaa;
        }
        .login-input:focus {
          border-color: var(--morandi-gold);
        }
        .login-button {
          display: block;
          width: 100%;
          font-weight: bold;
          background: linear-gradient(45deg, var(--morandi-gold) 0%, hsl(38, 35%, 65%) 100%);
          color: white;
          padding: 14px;
          margin-top: 20px;
          border-radius: 20px;
          box-shadow: rgba(180, 160, 120, 0.5) 0px 20px 10px -15px;
          border: none;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }
        .login-button:hover {
          transform: scale(1.03);
          box-shadow: rgba(180, 160, 120, 0.5) 0px 23px 10px -20px;
        }
        .login-button:active {
          transform: scale(0.95);
          box-shadow: rgba(180, 160, 120, 0.5) 0px 15px 10px -10px;
        }
        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
    </div>
  )
}
