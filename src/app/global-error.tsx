'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 記錄嚴重錯誤到 Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="zh-TW">
      <head>
        <title>系統錯誤</title>
      </head>
      <body className="m-0 font-sans">
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900">
          <div className="max-w-md w-full text-center text-slate-200">
            {/* 錯誤圖示 */}
            <div className="mb-6 text-6xl">⚠️</div>

            {/* 標題 */}
            <h1 className="text-3xl font-bold mb-2">系統發生嚴重錯誤</h1>

            {/* 描述 */}
            <p className="text-slate-400 mb-8">很抱歉，應用程式遇到了無法恢復的錯誤</p>

            {/* 錯誤訊息（開發模式） */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-mono text-status-danger break-words">{error.message}</p>
              </div>
            )}

            {/* 重試按鈕 */}
            <button
              onClick={reset}
              style={{
                background: 'linear-gradient(135deg, #f8eede 0%, #f5e8d3 50%, #ecd9bb 100%)',
                color: '#5c4a2f',
                borderColor: '#efe2c8',
              }}
              className="border px-6 py-2 rounded-md cursor-pointer text-base font-semibold transition-[filter] hover:brightness-[.96] active:brightness-[.92]"
            >
              重新載入應用程式
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
