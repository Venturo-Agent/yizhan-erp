'use client'

/**
 * SetupBanner — workspace setup 未完成時顯示的提示橫幅
 *
 * 2026-05-15 William 拍板：簽約客戶需完成 setup 才能完整作業、此 banner 提示 todos。
 * 不擋 feature、純提示 + 跳對應設定頁。
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ChevronDown, ChevronUp, X, ArrowRight, Check } from 'lucide-react'
import { CAPABILITIES, useCapabilities } from '@/lib/permissions'
import type { SetupStatus, SetupTodo } from '@/lib/setup/check-status'

export function SetupBanner() {
  const router = useRouter()
  const { can } = useCapabilities()
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/setup/status')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!cancelled) setStatus(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!can(CAPABILITIES.SETTINGS_MANAGE_COMPANY)) return null
  if (!status) return null

  // 完成 / 已 dismiss 不顯示
  if (status.completed || status.banner_dismissed_at) return null

  const handleDismiss = async () => {
    setDismissing(true)
    try {
      await fetch('/api/setup/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss_banner' }),
      })
      setStatus(prev => (prev ? { ...prev, banner_dismissed_at: new Date().toISOString() } : prev))
    } finally {
      setDismissing(false)
    }
  }

  const handleJump = (todo: SetupTodo) => {
    router.push(todo.action_url)
  }

  const progressPercent = Math.round((status.done_count / status.total) * 100)

  return (
    // eslint-disable-next-line venturo/no-forbidden-classes
    <div className="mx-4 mt-2 lg:mx-6 lg:mt-3 rounded-lg border border-morandi-gold bg-gradient-to-r from-morandi-cream-soft to-morandi-cream-warm shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-morandi-gold/5 transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <AlertCircle className="h-5 w-5 text-morandi-gold flex-shrink-0" />
          <div className="flex flex-col items-start min-w-0">
            <div className="text-sm font-semibold text-morandi-primary">
              系統設定尚未完成（{status.done_count} / {status.total}）
            </div>
            <div className="text-xs text-morandi-secondary truncate">
              還有 {status.total - status.done_count} 項待辦、點開查看
            </div>
          </div>
          {/* 進度條 */}
          <div className="hidden sm:flex items-center gap-2 ml-2">
            <div className="w-32 h-1.5 bg-morandi-muted/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-morandi-gold transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-morandi-secondary tabular-nums">{progressPercent}%</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-morandi-secondary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-morandi-secondary" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-morandi-gold/30 space-y-1.5">
          {status.todos.map(todo => (
            <div
              key={todo.key}
              className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-morandi-gold/5 group"
            >
              <div className="flex-shrink-0">
                {todo.done ? (
                  <div className="h-5 w-5 rounded-full bg-morandi-green/20 flex items-center justify-center">
                    <Check className="h-3 w-3 text-morandi-green" />
                  </div>
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-morandi-gold/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={
                    todo.done
                      ? 'text-sm text-morandi-secondary line-through'
                      : 'text-sm text-morandi-primary font-medium'
                  }
                >
                  {todo.label}
                </div>
                {todo.hint && !todo.done && (
                  <div className="text-xs text-morandi-secondary mt-0.5">{todo.hint}</div>
                )}
              </div>
              {!todo.done && (
                <button
                  type="button"
                  onClick={() => handleJump(todo)}
                  className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-morandi-gold hover:text-morandi-gold/80 px-2 py-1 rounded hover:bg-morandi-gold/10"
                >
                  立即設定
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          <div className="flex justify-end pt-2 border-t border-morandi-gold/20 mt-2">
            <button
              type="button"
              onClick={handleDismiss}
              disabled={dismissing}
              className="text-xs text-morandi-secondary hover:text-morandi-primary flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              暫不顯示此提示
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
