/**
 * Error Tracking — Sentry wrapper
 *
 * 統一入口給所有錯誤上報。
 * - 沒設 NEXT_PUBLIC_SENTRY_DSN 時只 console.log (dev / 尚未上線時)
 * - 有 DSN 就同時送 Sentry + console
 * - setUser 讓 Sentry 把錯誤跟當前登入者關聯
 *
 * Usage:
 *   import { captureException, captureMessage, setUser } from '@/lib/error-tracking'
 *
 * William 要啟用 Sentry:
 *   1. Sentry Dashboard 建 project、拿 DSN
 *   2. Vercel env var 加 NEXT_PUBLIC_SENTRY_DSN
 *   3. Sentry Dashboard 設 alert rule:
 *      - issue.level = error → Slack / Email
 *      - issue.first_seen 連續 5 個新 issue 在 1h → 高優先通知
 */

import * as Sentry from '@sentry/nextjs'

type ErrorLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug'

interface ErrorContext {
  module?: string
  extra?: Record<string, unknown>
  level?: ErrorLevel
  tags?: Record<string, string>
}

const SENTRY_ENABLED = !!process.env.NEXT_PUBLIC_SENTRY_DSN

let _currentUserId: string | null = null

export function captureException(error: unknown, context?: ErrorContext): void {
  const err = error instanceof Error ? error : new Error(String(error))
  const level = context?.level ?? 'error'

  // 永遠 console.log 一份、方便 dev debug
  console.error(`[error-tracking][${level}]`, err.message, {
    stack: err.stack,
    userId: _currentUserId,
    module: context?.module,
    ...context?.extra,
  })

  // DSN 有設才送 Sentry
  if (SENTRY_ENABLED) {
    Sentry.captureException(err, {
      level: level === 'warning' ? 'warning' : level === 'fatal' ? 'fatal' : 'error',
      tags: {
        ...(context?.module ? { module: context.module } : {}),
        ...(context?.tags ?? {}),
      },
      extra: context?.extra,
    })
  }
}

function _captureMessage(message: string, level: ErrorLevel = 'info'): void {
  // eslint-disable-next-line no-console -- error-tracking 自身的 fallback、不是 debug 殘留
  const logFn =
    level === 'error' || level === 'fatal'
      ? console.error
      : level === 'warning'
        ? console.warn
        : console.log
  logFn(`[error-tracking][${level}]`, message, { userId: _currentUserId })

  if (SENTRY_ENABLED) {
    Sentry.captureMessage(
      message,
      level === 'warning'
        ? 'warning'
        : level === 'fatal'
          ? 'fatal'
          : level === 'error'
            ? 'error'
            : 'info'
    )
  }
}

function _setUser(userId: string | null): void {
  _currentUserId = userId
  if (SENTRY_ENABLED) {
    Sentry.setUser(userId ? { id: userId } : null)
  }
}

async function _withErrorTracking<T>(
  module: string,
  fn: () => Promise<T>,
  extra?: Record<string, unknown>
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    captureException(error, { module, extra })
    throw error
  }
}
