'use client'
/**
 * ManagedDialog - 帶狀態管理的 Dialog 組件
 *
 * 功能特點：
 * - 內建 dirty 狀態檢測（表單是否修改過）
 * - 關閉前確認（如果有未保存的修改）
 * - 統一的關閉行為
 * - 支援確認對話框
 *
 * @example
 * ```tsx
 * <ManagedDialog
 *   open={isOpen}
 *   onOpenChange={handleOpenChange}
 *   title="編輯客戶"
 *   confirmOnDirtyClose
 *   confirmCloseTitle="放棄變更？"
 *   confirmCloseMessage="有未保存的變更，確定要關閉嗎？"
 * >
 *   {({ setDirty }) => (
 *     <Input
 *       value={name}
 *       onChange={(e) => {
 *         setName(e.target.value)
 *         setDirty(true)
 *       }}
 *     />
 *   )}
 * </ManagedDialog>
 * ```
 */

import { useState, useCallback, useRef, useEffect, ReactNode } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Save, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ManagedDialogRenderProps {
  /**
   * 設置 dirty 狀態（表單是否已修改）
   */
  setDirty: (dirty: boolean) => void

  /**
   * 當前 dirty 狀態
   */
  isDirty: boolean

  /**
   * 重置 dirty 狀態
   */
  resetDirty: () => void
}

interface ManagedDialogProps {
  /**
   * Dialog 開啟狀態
   */
  open: boolean

  /**
   * Dialog 狀態變更回調
   */
  onOpenChange: (open: boolean) => void

  /**
   * Dialog 標題
   */
  title: string

  /**
   * Dialog 副標題（可選）
   */
  subtitle?: string

  /**
   * Dialog 內容
   * 可以是 ReactNode 或 render function（提供 dirty 狀態管理）
   */
  children: ReactNode | ((props: ManagedDialogRenderProps) => ReactNode)

  /**
   * 當有未保存變更時，關閉前是否顯示確認對話框
   * 預設為 true
   */
  confirmOnDirtyClose?: boolean

  /**
   * 確認對話框標題
   */
  confirmCloseTitle?: string

  /**
   * 確認對話框訊息
   */
  confirmCloseMessage?: string

  /**
   * 確認對話框確認按鈕文字
   */
  confirmCloseLabel?: string

  /**
   * 確認對話框取消按鈕文字
   */
  cancelCloseLabel?: string

  /**
   * 提交處理函數
   */
  onSubmit?: () => void | Promise<void>

  /**
   * 提交按鈕文字
   */
  submitLabel?: string

  /**
   * 取消按鈕文字
   */
  cancelLabel?: string

  /**
   * 提交中狀態
   */
  loading?: boolean

  /**
   * 是否禁用提交按鈕
   */
  submitDisabled?: boolean

  /**
   * 最大寬度
   */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'

  /**
   * 自定義內容樣式類名
   */
  contentClassName?: string

  /**
   * 是否顯示 Footer
   */
  showFooter?: boolean

  /**
   * 自定義 Footer 內容
   */
  footer?: ReactNode

  /**
   * 關閉後回調（在確認關閉並關閉後觸發）
   */
  onAfterClose?: () => void

  /**
   * 外部控制的 dirty 狀態（可選）
   * 如果提供，將使用外部狀態而非內部狀態
   */
  externalDirty?: boolean

  /**
   * 外部 dirty 狀態變更回調
   */
  onDirtyChange?: (dirty: boolean) => void
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
}

export function ManagedDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  confirmOnDirtyClose = true,
  confirmCloseTitle = '放棄變更？',
  confirmCloseMessage = '有未保存的變更，確定要關閉嗎？',
  confirmCloseLabel = '放棄變更',
  cancelCloseLabel = '繼續編輯',
  onSubmit,
  submitLabel = '確定',
  cancelLabel = '取消',
  loading = false,
  submitDisabled = false,
  maxWidth = '2xl',
  contentClassName = '',
  showFooter = true,
  footer,
  onAfterClose,
  externalDirty,
  onDirtyChange,
}: ManagedDialogProps) {
  const t = useTranslations('managedDialog')

  // 內部 dirty 狀態（如果沒有外部控制）
  const [internalDirty, setInternalDirty] = useState(false)

  // 確認對話框狀態
  const [showConfirmClose, setShowConfirmClose] = useState(false)

  // 追蹤是否正在提交
  const isSubmittingRef = useRef(false)

  // 使用外部或內部 dirty 狀態
  const isDirty = externalDirty !== undefined ? externalDirty : internalDirty

  const setDirty = useCallback(
    (dirty: boolean) => {
      if (onDirtyChange) {
        onDirtyChange(dirty)
      } else {
        setInternalDirty(dirty)
      }
    },
    [onDirtyChange]
  )

  const resetDirty = useCallback(() => {
    setDirty(false)
  }, [setDirty])

  // Dialog 關閉時重置狀態
  useEffect(() => {
    if (!open) {
      // 延遲重置，等待關閉動畫完成
      const timer = setTimeout(() => {
        if (!externalDirty) {
          setInternalDirty(false)
        }
        setShowConfirmClose(false)
        onAfterClose?.()
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [open, externalDirty, onAfterClose])

  // 處理關閉請求
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // 如果正在提交，不處理關閉
        if (isSubmittingRef.current) {
          return
        }

        // 如果有未保存的變更且需要確認
        if (isDirty && confirmOnDirtyClose) {
          setShowConfirmClose(true)
          return
        }
      }
      onOpenChange(newOpen)
    },
    [isDirty, confirmOnDirtyClose, onOpenChange]
  )

  // 確認關閉
  const handleConfirmClose = useCallback(() => {
    setShowConfirmClose(false)
    onOpenChange(false)
  }, [onOpenChange])

  // 取消關閉確認
  const handleCancelClose = useCallback(() => {
    setShowConfirmClose(false)
  }, [])

  // 處理提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (onSubmit) {
      isSubmittingRef.current = true
      try {
        await onSubmit()
        // 提交成功後重置 dirty 狀態
        resetDirty()
      } finally {
        isSubmittingRef.current = false
      }
    }
  }

  // 處理取消
  const handleCancel = useCallback(() => {
    if (isDirty && confirmOnDirtyClose) {
      setShowConfirmClose(true)
    } else {
      onOpenChange(false)
    }
  }, [isDirty, confirmOnDirtyClose, onOpenChange])

  // Render props
  const renderProps: ManagedDialogRenderProps = {
    setDirty,
    isDirty,
    resetDirty,
  }

  const shouldShowFooter = showFooter && onSubmit

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent level={1} className={`${maxWidthClasses[maxWidth]} ${contentClassName}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {title}
              {isDirty && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-status-warning-bg text-status-warning">
                  {t('unsaved')}
                </span>
              )}
            </DialogTitle>
            {subtitle && <p className="text-sm text-morandi-secondary mt-1">{subtitle}</p>}
          </DialogHeader>

          {onSubmit ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                {typeof children === 'function' ? children(renderProps) : children}
              </div>

              {shouldShowFooter && (
                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  {footer || (
                    <>
                      <Button
                        type="button"
                        variant="soft-gold"
                        onClick={handleCancel}
                        className="gap-2"
                      >
                        <X size="1em" />
                        {cancelLabel}
                      </Button>
                      <Button
                        variant="soft-gold"
                        type="submit"
                        disabled={loading || submitDisabled}
                        className="gap-2"
                      >
                        <Save size="1em" />
                        {loading ? '處理中...' : submitLabel}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              {typeof children === 'function' ? children(renderProps) : children}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 確認關閉對話框（嵌套 Dialog，使用透明遮罩避免背景過黑） */}
      <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <DialogContent nested level={2} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-status-warning">
              <AlertTriangle size="1.25em" />
              {confirmCloseTitle}
            </DialogTitle>
          </DialogHeader>

          <p className="text-morandi-primary py-2">{confirmCloseMessage}</p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="soft-gold" onClick={handleCancelClose} className="gap-2">
              <X size="1em" />
              {cancelCloseLabel}
            </Button>
            <Button
              onClick={handleConfirmClose}
              className="bg-status-warning hover:bg-status-warning/90 text-white gap-2"
            >
              <AlertTriangle size="1em" />
              {confirmCloseLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * useDirtyState Hook
 * 用於追蹤表單的 dirty 狀態
 */
export function useDirtyState(initialValue = false) {
  const [isDirty, setIsDirty] = useState(initialValue)
  const originalDataRef = useRef<unknown>(null)

  const markDirty = useCallback(() => setIsDirty(true), [])
  const resetDirty = useCallback(() => setIsDirty(false), [])

  const setOriginalData = useCallback((data: unknown) => {
    originalDataRef.current = data
  }, [])

  const checkDirty = useCallback((currentData: unknown) => {
    const dirty = JSON.stringify(currentData) !== JSON.stringify(originalDataRef.current)
    setIsDirty(dirty)
    return dirty
  }, [])

  return {
    isDirty,
    setDirty: setIsDirty,
    markDirty,
    resetDirty,
    setOriginalData,
    checkDirty,
  }
}
