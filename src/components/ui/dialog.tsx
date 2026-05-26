'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Dialog 標準寬度規格
 *
 * 使用指南：
 * - sm:   確認對話框、簡單選擇（max-w-sm, ~384px）
 * - md:   簡單表單，3-5 個欄位（max-w-md, ~448px）
 * - lg:   中等表單，5-10 個欄位（max-w-lg, ~512px）
 * - xl:   複雜表單，多區塊配置（max-w-xl, ~576px）
 * - 2xl:  含預覽的表單、雙欄佈局（max-w-2xl, ~672px）
 * - 4xl:  分頁式複雜表單、多功能面板（max-w-4xl, ~896px）
 * - full: 編輯器類型、全螢幕操作（max-w-[95vw]）
 */
export const DIALOG_SIZES = {
  sm: 'max-w-sm', // 小型確認框
  md: 'max-w-md', // 標準表單
  lg: 'max-w-lg', // 大型表單
  xl: 'max-w-xl', // 複雜表單
  '2xl': 'max-w-2xl', // 多欄表單
  '4xl': 'max-w-4xl', // 全螢幕表單
  full: 'max-w-[95vw]', // 幾乎全螢幕
} as const

type DialogSize = keyof typeof DIALOG_SIZES

/**
 * Dialog 層級系統
 *
 * 用於處理巢狀 Dialog 的 z-index 層級：
 * - Level 1: 主 Dialog（從頁面打開）- 有黑色遮罩
 * - Level 2: 子 Dialog（從主 Dialog 打開）- 透明遮罩
 * - Level 3: 孫 Dialog（從子 Dialog 打開）- 透明遮罩
 * - Level 4: 曾孫 Dialog - 透明遮罩
 * - Level 5: 極少用 - 透明遮罩
 *
 * 使用範例：
 * - 頂層 Dialog: <DialogContent level={1}>
 * - 子 Dialog:   <DialogContent level={2}>
 * - 孫 Dialog:   <DialogContent level={3}>
 */
export type DialogLevel = 1 | 2 | 3 | 4 | 5

/**
 * 每個層級的 z-index 設定
 * - overlay: 遮罩層
 * - content: Dialog 內容
 * - close: 關閉按鈕
 */
const DIALOG_Z_INDEX = {
  1: { overlay: 9000, content: 9010, close: 9011 },
  2: { overlay: 9100, content: 9110, close: 9111 },
  3: { overlay: 9200, content: 9210, close: 9211 },
  4: { overlay: 9300, content: 9310, close: 9311 },
  5: { overlay: 9400, content: 9410, close: 9411 },
} as const

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    onDragOver={e => e.preventDefault()}
    onDrop={e => e.preventDefault()}
    className={cn(
      'fixed inset-0 z-[9000] bg-morandi-primary/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

interface DialogContentProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> {
  /**
   * Dialog 寬度大小
   * @default 'lg'
   *
   * 使用指南：
   * - sm:   確認對話框、簡單選擇
   * - md:   簡單表單（3-5 個欄位）
   * - lg:   中等表單（5-10 個欄位）- 預設值
   * - xl:   複雜表單（多區塊）
   * - 2xl:  含預覽的表單
   * - 4xl:  分頁式複雜表單
   * - full: 編輯器類型
   */
  size?: DialogSize
  /**
   * Dialog 層級（1-5）
   * @default 1
   *
   * 使用指南：
   * - 1: 主 Dialog（從頁面打開）
   * - 2: 子 Dialog（從主 Dialog 打開）
   * - 3: 孫 Dialog（從子 Dialog 打開）
   * - 4+: 更深層的巢狀（極少用）
   */
  level?: DialogLevel
  /**
   * 向後兼容：nested={true} 等同於 level={2}
   * 新 code 請直接用 level={2}
   */
  nested?: boolean
  /**
   * 自訂 overlay 的 className（覆蓋預設遮罩樣式）
   * 用於 lightbox 等需要不同遮罩效果的場景
   */
  overlayClassName?: string
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(
  (
    { className, children, size = 'lg', level, nested = false, overlayClassName, ...props },
    ref
  ) => {
    // 向後兼容：nested={true} 等同於 level={2}
    const effectiveLevel: DialogLevel = level ?? (nested ? 2 : 1)
    const zIndex = DIALOG_Z_INDEX[effectiveLevel]
    const showOverlay = effectiveLevel === 1

    return (
      <DialogPortal>
        {/*
        Dialog 遮罩設計：
        - Level 1: bg-black/60 (60% 黑色) + 背景模糊
        - Level 2+: 透明遮罩（避免多重黑色疊加）
      */}
        <DialogPrimitive.Overlay
          onDragOver={e => e.preventDefault()}
          onDrop={e => e.preventDefault()}
          className={cn(
            'fixed inset-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            overlayClassName ||
              (showOverlay
                ? 'bg-morandi-primary/40 backdrop-blur-sm'
                : 'bg-morandi-primary/20 backdrop-blur-sm')
          )}
          style={{ zIndex: zIndex.overlay }}
        />
        <DialogPrimitive.Content
          ref={ref}
          aria-describedby={undefined}
          onOpenAutoFocus={e => e.preventDefault()}
          onCloseAutoFocus={e => {
            e.preventDefault()
            // 移除焦點，避免 aria-hidden 警告
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur()
            }
          }}
          aria-labelledby={undefined}
          className={cn(
            // 5/13：max-h-[90vh] + overflow-y-auto 防小螢幕看不全（客戶筆電不能滾動 bug）
            // overscroll-contain 避免 Dialog 內滾到底時外層也跟著滾
            'fixed left-[50%] top-[50%] grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border border-morandi-container bg-card p-8 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-xl max-h-[90vh] overflow-y-auto overscroll-contain',
            DIALOG_SIZES[size],
            className
          )}
          style={{ zIndex: zIndex.content }}
          {...props}
        >
          {children}
          <DialogPrimitive.Close
            className="absolute right-1 top-1 h-7 w-7 flex items-center justify-center rounded-full text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/60 transition-all cursor-pointer focus:outline-none"
            style={{ zIndex: zIndex.close }}
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    )
  }
)
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  // Types

  // Constants
}
