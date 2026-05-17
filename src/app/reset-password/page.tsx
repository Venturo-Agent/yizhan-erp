'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  // Supabase 把 token 放在 URL hash，監聽 PASSWORD_RECOVERY 事件
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('密碼至少 6 個字元')
      return
    }
    if (password !== confirm) {
      setError('兩次密碼不一致')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setDone(true)
      setTimeout(() => { window.location.href = '/login' }, 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定失敗，請重試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-card to-morandi-container">
      {/* eslint-disable-next-line venturo/no-forbidden-classes */}
      <div className="w-full max-w-[380px] mx-4 bg-gradient-to-t from-white to-morandi-cream rounded-[40px] px-10 py-8 border-[5px] border-white shadow-[rgba(180,160,120,0.45)_0px_30px_30px_-20px]">
        <h1 className="text-center font-black text-[1.4rem] tracking-tight text-[var(--morandi-gold)]">
          重設密碼
        </h1>
        <p className="text-center text-xs text-morandi-muted mt-1">設定你的新登入密碼</p>

        {done ? (
          <div className="mt-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 size={40} className="text-morandi-green" />
            <p className="text-sm text-morandi-primary font-medium">密碼已更新！</p>
            <p className="text-xs text-morandi-muted">正在跳回登入頁...</p>
          </div>
        ) : !ready ? (
          <div className="mt-6 text-center">
            <p className="text-sm text-morandi-secondary">驗證連結中，請稍候...</p>
            <p className="text-xs text-morandi-muted mt-2">如果等太久，請重新點擊信中的連結</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5">
            {error && (
              <div className="mb-3 p-3 bg-morandi-red/10 border border-morandi-red/30 rounded-2xl flex items-start gap-2">
                <AlertCircle size={14} className="text-morandi-red mt-0.5 shrink-0" />
                <span className="text-xs text-morandi-red">{error}</span>
              </div>
            )}

            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="新密碼（至少 6 個字元）"
                required
                className="reset-input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-morandi-muted mt-[7px]"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="再次輸入新密碼"
              required
              className="reset-input"
            />

            <button type="submit" disabled={loading} className="reset-button">
              {loading ? '設定中...' : '確認新密碼'}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .reset-input {
          width: 100%;
          background: white;
          border: 2px solid transparent;
          padding: 14px 20px;
          border-radius: 20px;
          margin-top: 14px;
          box-shadow: rgba(180,160,120,0.2) 0px 10px 10px -5px;
          font-size: 14px;
          color: #333;
          outline: none;
          transition: border-color 0.2s;
        }
        .reset-input::placeholder { color: #aaa; }
        .reset-input:focus { border-color: var(--morandi-gold); }
        .reset-button {
          display: block;
          width: 100%;
          font-weight: bold;
          background: linear-gradient(45deg, var(--morandi-gold) 0%, hsl(38,35%,65%) 100%);
          color: white;
          padding: 14px;
          margin-top: 20px;
          border-radius: 20px;
          box-shadow: rgba(180,160,120,0.5) 0px 20px 10px -15px;
          border: none;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }
        .reset-button:hover { transform: scale(1.03); }
        .reset-button:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
      `}</style>
    </div>
  )
}
