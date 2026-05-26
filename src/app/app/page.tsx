'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'

const LAST_CODE_KEY = 'venturo-app-last-code'

export default function AppLoginPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberCode, setRememberCode] = useState(true)
  const { validateLogin } = useAuthStore()

  useEffect(() => {
    const lastCode = localStorage.getItem(LAST_CODE_KEY)
    if (lastCode) {
      setCode(lastCode)
    }
  }, [])

  const getRedirectPath = (): string => {
    const lastPath = localStorage.getItem('last-visited-path')
    if (lastPath && lastPath !== '/login' && lastPath !== '/app') return lastPath
    return '/app/dashboard'
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedCode = code.trim().toUpperCase()
    if (!trimmedCode) {
      setError('請輸入組織代碼')
      return
    }
    if (!email.trim()) {
      setError('請輸入 Email')
      return
    }
    if (!password) {
      setError('請輸入密碼')
      return
    }

    if (rememberCode) {
      localStorage.setItem(LAST_CODE_KEY, trimmedCode)
    } else {
      localStorage.removeItem(LAST_CODE_KEY)
    }

    setIsLoading(true)

    try {
      const result = await Promise.race([
        validateLogin(email.trim(), password, trimmedCode),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('登入逾時，請檢查網路')), 15000)
        ),
      ])

      if (result.success) {
        if (result.mustChangePassword) {
          router.push('/app/change-password?reason=first_login')
        } else {
          router.push(getRedirectPath())
        }
      } else {
        setError(result.message || '登入失敗')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(msg.includes('逾時') || msg.includes('network') ? msg : '系統錯誤，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app-login-container">
      <div className="login-card">
        <div className="login-logo">
          <h1 className="login-title">VENTURO</h1>
          <p className="login-subtitle">旅遊業管理系統</p>
        </div>

        {error && (
          <div className="login-error">
            <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
            <span className="login-error-text">{error}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleLogin}>
          <div className="login-field">
            <label className="login-label">組織代碼</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="請輸入組織代碼"
              className="login-input"
              autoComplete="organization"
              autoFocus
            />
          </div>

          <div className="login-field">
            <label className="login-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="請輸入 Email"
              className="login-input"
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div className="login-field">
            <label className="login-label">密碼</label>
            <div className="login-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="請輸入密碼"
                className="login-input"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="login-reminder">
            <input
              type="checkbox"
              id="rememberCode"
              checked={rememberCode}
              onChange={e => setRememberCode(e.target.checked)}
              className="login-checkbox"
            />
            <label htmlFor="rememberCode" className="login-reminder-label">
              記住組織代碼
            </label>
          </div>

          <button type="submit" disabled={isLoading} className="login-btn">
            {isLoading ? (
              <span className="login-loading">
                <span className="login-loading-dot" />
                <span className="login-loading-dot" />
              </span>
            ) : (
              '登入'
            )}
          </button>
        </form>

        <div className="login-footer">
          <button className="login-footer-link">忘記密碼？</button>
        </div>
      </div>
    </div>
  )
}
