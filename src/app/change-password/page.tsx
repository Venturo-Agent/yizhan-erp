'use client'

import { useState } from 'react'
import { Lock, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

const LABELS = {
  TITLE: '首次登入',
  SUBTITLE: '請設定新密碼、開始使用系統',
  NEW_PLACEHOLDER: '新密碼（至少 6 個字元）',
  CONFIRM_PLACEHOLDER: '再次輸入新密碼',
  SUBMIT: '設定密碼並進入系統',
  PROCESSING: '處理中...',
  MISMATCH: '兩次新密碼不一致',
  TOO_SHORT: '新密碼至少 6 個字元',
  ERROR_SYSTEM: '伺服器錯誤、請稍後重試',
}

export default function ChangePasswordPage() {
  // 5/17 William 拍板：首次登入不需輸入舊密碼（預設都是 12345678、輸入很蠢）
  // 後端 API 用 must_change_password=true 判斷、跳過舊密碼驗證
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (next !== confirm) {
      setError(LABELS.MISMATCH)
      return
    }
    if (next.length < 6) {
      setError(LABELS.TOO_SHORT)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // current_password 不傳、後端讀 must_change_password=true 自動跳過驗證
          new_password: next,
        }),
      })
      const data = await res.json()
      if (data.success) {
        // Supabase admin.updateUserById 改密後會 invalidate 既有 session
        // backend 回的 authEmail + 新密碼 → client signInWithPassword 拿 fresh session
        // 否則進 /dashboard 會被 middleware 307 redirect 回 /login 死循環
        const authEmail = data.data?.authEmail as string | undefined
        if (!authEmail) {
          // 拿不到 email — 同樣要清掉已失效的舊 session、再走 login
          await supabase.auth.signOut()
          window.location.href = '/login'
          return
        }
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: next,
        })
        if (signInError) {
          // admin.updateUserById 讓舊 session 在 server 失效、本地快取仍殘留。
          // 不清就跳 /login → login 的 getSession() 讀到舊（無效）session → 誤 redirect → 死循環。
          await supabase.auth.signOut()
          window.location.href = '/login'
          return
        }
        // 清 SWR cache：user_id 不變但 session 換新、清快取確保後續拿到乾淨資料
        const { clearAllSwrCacheKeys } = await import('@/lib/swr/config')
        clearAllSwrCacheKeys()
        window.location.href = '/dashboard'
        return
      }
      setError(data.error || LABELS.ERROR_SYSTEM)
    } catch {
      setError(LABELS.ERROR_SYSTEM)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-card to-morandi-container">
      {/* eslint-disable-next-line venturo/no-forbidden-classes */}
      <div className="w-full max-w-[420px] mx-4 bg-gradient-to-t from-white to-morandi-cream rounded-[40px] px-10 py-8 border-[5px] border-white shadow-[rgba(180,160,120,0.45)_0px_30px_30px_-20px]">
        <div className="flex items-center justify-center gap-2 text-[var(--morandi-gold)]">
          <Lock size={22} />
          <h1 className="font-black text-[1.412rem] tracking-tight">{LABELS.TITLE}</h1>
        </div>
        <p className="text-center text-xs text-morandi-muted mt-1">{LABELS.SUBTITLE}</p>

        {error && (
          <div className="mt-4 p-3 bg-status-danger/10 border border-status-danger/30 rounded-2xl flex items-start gap-2">
            <AlertTriangle size={16} className="text-status-danger mt-0.5 shrink-0" />
            <span className="text-xs text-status-danger">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5">
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={next}
              onChange={e => setNext(e.target.value)}
              placeholder={LABELS.NEW_PLACEHOLDER}
              required
              minLength={6}
              autoComplete="new-password"
              autoFocus
              className="cp-input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-morandi-muted hover:text-morandi-secondary mt-[7px]"
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder={LABELS.CONFIRM_PLACEHOLDER}
              required
              autoComplete="new-password"
              className="cp-input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-morandi-muted hover:text-morandi-secondary mt-[7px]"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button type="submit" disabled={loading || !next || !confirm} className="cp-button">
            {loading ? LABELS.PROCESSING : LABELS.SUBMIT}
          </button>
        </form>
      </div>

      <style>{`
        .cp-input {
          width: 100%;
          padding: 12px 16px;
          margin-top: 12px;
          background-color: white;
          border: 2px solid var(--morandi-cream);
          border-radius: 24px;
          font-size: 14px;
          color: var(--morandi-primary);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .cp-input:focus {
          outline: none;
          border-color: var(--morandi-gold);
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
        }
        .cp-input::placeholder { color: var(--morandi-muted); }
        .cp-button {
          width: 100%;
          margin-top: 16px;
          padding: 12px 16px;
          background: var(--morandi-gold);
          color: white;
          font-weight: 600;
          font-size: 14px;
          border-radius: 24px;
          transition: opacity 0.2s, transform 0.1s;
        }
        .cp-button:hover:not(:disabled) { opacity: 0.9; }
        .cp-button:active:not(:disabled) { transform: scale(0.98); }
        .cp-button:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
