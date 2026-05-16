'use client'

import { useEffect } from 'react'

export function ErrorLogger() {
  useEffect(() => {
    // 捕獲未處理的錯誤
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error)
      const errorData = {
        message: event.message,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack || event.error?.toString(),
        timestamp: new Date().toISOString(),
        type: 'error',
      }

      // 將錯誤寫入文件系統
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      }).catch(console.error)
    }

    // 捕獲未處理的 Promise rejection
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
      const errorData = {
        message: 'Unhandled Promise Rejection',
        error: event.reason?.stack || event.reason?.toString() || String(event.reason),
        timestamp: new Date().toISOString(),
        type: 'unhandledRejection',
      }

      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      }).catch(console.error)
    }

    // 捕獲 React Hydration 錯誤
    const originalConsoleError = console.error?.bind(console)
    let isLoggingError = false // 防止無限循環的標誌

    if (!originalConsoleError) return // 如果沒有 console.error，直接返回

    console.error = function (...args) {
      // 如果正在記錄錯誤，直接使用原始 console.error 並返回
      if (isLoggingError) {
        originalConsoleError(...args)
        return
      }

      // 先輸出到原始的 console.error
      try {
        originalConsoleError(...args)
      } catch {
        // 如果輸出失敗，靜默處理
      }

      // 避免在 ErrorLogger 內部再次觸發錯誤日誌
      try {
        isLoggingError = true

        const errorString = args
          .map(arg => {
            try {
              return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            } catch {
              return String(arg)
            }
          })
          .join(' ')

        if (
          errorString.includes('Hydration') ||
          errorString.includes('Text content does not match') ||
          errorString.includes('did not match')
        ) {
          const errorData = {
            message: 'Hydration Error',
            error: errorString,
            timestamp: new Date().toISOString(),
            type: 'hydration',
          }

          fetch('/api/log-error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(errorData),
          }).catch(() => {
            // 使用原始的 console.error，避免遞迴
            originalConsoleError('Failed to log error to API')
          })
        }
      } catch (err) {
        // 如果日誌記錄本身出錯，使用原始的 console.error
        originalConsoleError('ErrorLogger internal error:', err)
      } finally {
        // 重置標誌，允許下次記錄
        isLoggingError = false
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
      console.error = originalConsoleError
    }
  }, [])

  return null
}
