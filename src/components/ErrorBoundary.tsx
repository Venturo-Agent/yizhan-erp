'use client'

import React, { useCallback, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/utils/logger'
import { COMPONENT_LABELS } from './constants/labels'

// ============================================
// Types
// ============================================

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

// ============================================
// Error Display UI Component
// ============================================

interface ErrorDisplayProps {
  error?: Error
  errorInfo?: React.ErrorInfo
  onRetry?: () => void
}

function ErrorDisplay({ error, errorInfo, onRetry }: ErrorDisplayProps) {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-morandi-container/30 to-background">
      <div className="max-w-2xl w-full mx-4 p-8 bg-card rounded-xl shadow-lg border border-border">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-status-danger/10 rounded-full">
            <AlertTriangle className="w-8 h-8 text-status-danger" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-morandi-primary">
              {COMPONENT_LABELS.LABEL_6301}
            </h1>
            <p className="text-morandi-secondary mt-1">{COMPONENT_LABELS.LABEL_1698}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Error Message */}
          <div className="p-4 bg-status-danger/5 border border-status-danger/20 rounded-lg">
            <p className="text-sm font-medium text-status-danger mb-2">
              {COMPONENT_LABELS.LABEL_1425}
            </p>
            <code className="text-sm text-morandi-primary break-words">
              {error?.message || '未知錯誤'}
            </code>
          </div>

          {/* Development Only: Stack Traces */}
          {isDevelopment && (
            <>
              {error?.stack && (
                <details className="group">
                  <summary className="cursor-pointer p-4 bg-morandi-container/40 border border-border/60 rounded-lg hover:bg-morandi-container/60 transition-colors">
                    <span className="text-sm font-medium text-morandi-primary">
                      {COMPONENT_LABELS.LABEL_7533}
                    </span>
                  </summary>
                  <div className="mt-2 p-4 bg-morandi-container/20 border border-border/40 rounded-lg">
                    <pre className="text-xs text-morandi-secondary overflow-auto max-h-48 whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </div>
                </details>
              )}

              {errorInfo?.componentStack && (
                <details className="group">
                  <summary className="cursor-pointer p-4 bg-morandi-container/40 border border-border/60 rounded-lg hover:bg-morandi-container/60 transition-colors">
                    <span className="text-sm font-medium text-morandi-primary">
                      {COMPONENT_LABELS.LABEL_82}
                    </span>
                  </summary>
                  <div className="mt-2 p-4 bg-morandi-container/20 border border-border/40 rounded-lg">
                    <pre className="text-xs text-morandi-secondary overflow-auto max-h-48 whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
              )}
            </>
          )}

          {/* Retry Button */}
          <Button
            variant="soft-gold"
            onClick={onRetry || (() => window.location.reload())}
            className="w-full gap-2"
          >
            <RefreshCw size="1em" />
            {COMPONENT_LABELS.LOADING_8807}
          </Button>

          {/* Hint */}
          <p className="text-xs text-morandi-muted text-center">{COMPONENT_LABELS.MANAGE_6909}</p>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Error Boundary Class Component
// ============================================

/**
 * ErrorBoundary 組件
 *
 * 捕獲 React 組件樹中的 JavaScript 錯誤，
 * 記錄錯誤並顯示友好的錯誤頁面。
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   fallback={<CustomErrorPage />}
 *   onError={(error, info) => sendToErrorTracking(error, info)}
 * >
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 更新 state
    this.setState({
      error,
      errorInfo,
    })

    // 使用 logger 記錄錯誤
    logger.error('[ErrorBoundary] 捕獲到錯誤:', error.message)
    logger.error('[ErrorBoundary] 錯誤堆疊:', error.stack)
    logger.error('[ErrorBoundary] 組件堆疊:', errorInfo.componentStack)

    // 呼叫 onError callback
    this.props.onError?.(error, errorInfo)

    // 將錯誤寫入 localStorage 以便持久化（保留最近 10 個錯誤）
    try {
      const errorLog = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : '',
      }

      const existingErrors = localStorage.getItem('errorLog')
      const errors = existingErrors ? JSON.parse(existingErrors) : []
      errors.push(errorLog)
      localStorage.setItem('errorLog', JSON.stringify(errors.slice(-10)))
    } catch (storageError) {
      logger.warn('[ErrorBoundary] 無法儲存錯誤日誌到 localStorage:', storageError)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      // 如果有自訂 fallback，優先使用
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 否則使用預設的錯誤顯示
      return (
        <ErrorDisplay
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
        />
      )
    }

    return this.props.children
  }
}

// ============================================
// useErrorHandler Hook
// ============================================

interface UseErrorHandlerReturn {
  /** 當前錯誤狀態 */
  error: Error | null
  /** 是否有錯誤 */
  hasError: boolean
  /** 手動觸發錯誤顯示 */
  showError: (error: Error) => void
  /** 清除錯誤狀態 */
  clearError: () => void
  /** 包裝 async function，自動捕獲錯誤 */
  handleAsync: <T>(fn: () => Promise<T>) => Promise<T | undefined>
}

/**
 * useErrorHandler Hook
 *
 * 用於 functional component 中手動處理錯誤。
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { error, hasError, showError, clearError, handleAsync } = useErrorHandler()
 *
 *   const handleSubmit = async () => {
 *     await handleAsync(async () => {
 *       // 這裡的錯誤會被自動捕獲
 *       await submitData()
 *     })
 *   }
 *
 *   if (hasError) {
 *     return (
 *       <div>
 *         <p>錯誤: {error?.message}</p>
 *         <button onClick={clearError}>重試</button>
 *       </div>
 *     )
 *   }
 *
 *   return <button onClick={handleSubmit}>提交</button>
 * }
 * ```
 */
function _useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<Error | null>(null)

  const showError = useCallback((err: Error) => {
    logger.error('[useErrorHandler] 錯誤:', err.message)
    setError(err)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleAsync = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await fn()
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        showError(error)
        return undefined
      }
    },
    [showError]
  )

  return {
    error,
    hasError: error !== null,
    showError,
    clearError,
    handleAsync,
  }
}

// ============================================
// ErrorFallback Component (for use with fallback prop)
// ============================================

interface ErrorFallbackProps {
  error?: Error
  resetError?: () => void
}

/**
 * ErrorFallback 組件
 *
 * 可作為 ErrorBoundary 的 fallback prop 使用的簡化版錯誤顯示。
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
function _ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return <ErrorDisplay error={error} onRetry={resetError || (() => window.location.reload())} />
}

// ============================================
// Default Export
// ============================================
