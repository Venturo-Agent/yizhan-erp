'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
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
      <div className="glass-card">
        <div className="app-logo">
          <h1 className="app-title">VENTURO</h1>
          <p className="app-subtitle">旅遊業管理系統</p>
        </div>

        {error && (
          <div className="app-error">
            <AlertCircle size={18} className="app-error-icon" />
            <span className="app-error-text">{error}</span>
          </div>
        )}

        <form className="app-form" onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">組織代碼</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="請輸入組織代碼"
              className="app-input uppercase"
              autoComplete="organization"
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="請輸入 Email"
              className="app-input"
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div className="input-group">
            <label className="input-label">密碼</label>
            <div className="app-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="請輸入密碼"
                className="app-input"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="app-input-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="remember-row">
            <input
              type="checkbox"
              id="rememberCode"
              checked={rememberCode}
              onChange={e => setRememberCode(e.target.checked)}
              className="remember-checkbox"
            />
            <label htmlFor="rememberCode" className="remember-label">
              記住組織代碼
            </label>
          </div>

          <button type="submit" disabled={isLoading} className="app-button">
            {isLoading ? (
              <span className="app-loading">
                <span className="app-loading-dot" />
                <span className="app-loading-dot" />
                <span className="app-loading-dot" />
              </span>
            ) : (
              '登入'
            )}
          </button>
        </form>

        <div className="app-footer">
          <button className="app-footer-link">忘記密碼？</button>
        </div>
      </div>
    </div>
  )
}