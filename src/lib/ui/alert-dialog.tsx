'use client'

import { create } from 'zustand'
import { CheckCircle, Info, XCircle, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UI_LABELS } from './constants/labels'
import { sanitizeHtml } from '@/lib/utils/sanitize'

type AlertType = 'info' | 'success' | 'warning' | 'error'

interface AlertState {
  isOpen: boolean
  type: AlertType
  title?: string
  message: string
  onClose?: () => void
}

interface ConfirmState {
  isOpen: boolean
  type: AlertType
  title?: string
  message: string
  htmlContent?: string // 支援 HTML 內容
  confirmText?: string
  cancelText?: string
  showThirdOption?: boolean // 是否顯示第三個選項
  thirdOptionText?: string // 第三個選項的文字
  onConfirm?: () => void
  onCancel?: () => void
  onThirdOption?: () => void // 第三個選項的回調
}

interface PromptState {
  isOpen: boolean
  title?: string
  message: string
  placeholder?: string
  defaultValue?: string
  inputType?: 'text' | 'password'
  confirmText?: string
  cancelText?: string
  value: string
  onConfirm?: (value: string) => void
  onCancel?: () => void
}

interface DialogStore {
  alert: AlertState
  confirm: ConfirmState
  prompt: PromptState
  showAlert: (message: string, type?: AlertType, title?: string) => Promise<void>
  showConfirm: (
    message: string,
    options?: {
      type?: AlertType
      title?: string
      htmlContent?: string
      confirmText?: string
      cancelText?: string
      showThirdOption?: boolean
      thirdOptionText?: string
    }
  ) => Promise<boolean | 'third'>
  showPrompt: (
    message: string,
    options?: {
      title?: string
      placeholder?: string
      defaultValue?: string
      inputType?: 'text' | 'password'
      confirmText?: string
      cancelText?: string
    }
  ) => Promise<string | null>
  closeAlert: () => void
  closeConfirm: (confirmed: boolean) => void
  closePrompt: (confirmed: boolean) => void
  setPromptValue: (value: string) => void
}

const useDialogStore = create<DialogStore>((set, get) => ({
  alert: {
    isOpen: false,
    type: 'info',
    message: '',
  },
  confirm: {
    isOpen: false,
    type: 'warning',
    message: '',
  },
  prompt: {
    isOpen: false,
    message: '',
    value: '',
  },
  showAlert: (message, type = 'info', title) => {
    return new Promise(resolve => {
      set({
        alert: {
          isOpen: true,
          type,
          title,
          message,
          onClose: () => {
            get().closeAlert()
            resolve()
          },
        },
      })
    })
  },
  showConfirm: (message, options = {}) => {
    return new Promise(resolve => {
      set({
        confirm: {
          isOpen: true,
          type: options.type || 'warning',
          title: options.title,
          message,
          htmlContent: options.htmlContent,
          confirmText: options.confirmText || '確認',
          cancelText: options.cancelText || '取消',
          showThirdOption: options.showThirdOption,
          thirdOptionText: options.thirdOptionText,
          onConfirm: () => {
            get().closeConfirm(true)
            resolve(true)
          },
          onCancel: () => {
            get().closeConfirm(false)
            resolve(false)
          },
          onThirdOption: () => {
            get().closeConfirm(false)
            resolve('third')
          },
        },
      })
    })
  },
  closeAlert: () => {
    set(state => ({
      alert: { ...state.alert, isOpen: false },
    }))
  },
  closeConfirm: confirmed => {
    set(state => ({
      confirm: { ...state.confirm, isOpen: false },
    }))
  },
  showPrompt: (message, options = {}) => {
    return new Promise(resolve => {
      set({
        prompt: {
          isOpen: true,
          title: options.title,
          message,
          placeholder: options.placeholder || '',
          defaultValue: options.defaultValue || '',
          inputType: options.inputType || 'text',
          confirmText: options.confirmText || '確認',
          cancelText: options.cancelText || '取消',
          value: options.defaultValue || '',
          onConfirm: (value: string) => {
            get().closePrompt(true)
            resolve(value)
          },
          onCancel: () => {
            get().closePrompt(false)
            resolve(null)
          },
        },
      })
    })
  },
  closePrompt: confirmed => {
    set(state => ({
      prompt: { ...state.prompt, isOpen: false },
    }))
  },
  setPromptValue: (value: string) => {
    set(state => ({
      prompt: { ...state.prompt, value },
    }))
  },
}))

const typeConfig: Record<AlertType, { icon: React.ReactNode; color: string; bgColor: string }> = {
  info: {
    icon: <Info className="h-6 w-6" />,
    color: 'text-morandi-primary',
    bgColor: 'bg-morandi-primary/10',
  },
  success: {
    icon: <CheckCircle className="h-6 w-6" />,
    color: 'text-morandi-gold',
    bgColor: 'bg-morandi-gold/10',
  },
  warning: {
    icon: <AlertTriangle className="h-6 w-6" />,
    color: 'text-morandi-gold',
    bgColor: 'bg-morandi-gold/10',
  },
  error: {
    icon: <XCircle className="h-6 w-6" />,
    color: 'text-morandi-red',
    bgColor: 'bg-morandi-red/10',
  },
}

function AlertDialogComponent() {
  const { alert, closeAlert } = useDialogStore()
  const config = typeConfig[alert.type]

  return (
    <Dialog open={alert.isOpen} onOpenChange={open => !open && closeAlert()}>
      <DialogContent level={4} className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`${config.bgColor} ${config.color} p-2 rounded-lg`}>{config.icon}</div>
            <div className="flex-1">
              <DialogTitle className={alert.title ? 'text-morandi-primary mb-2' : 'sr-only'}>
                {alert.title || '提示'}
              </DialogTitle>
              <DialogDescription className="text-morandi-secondary whitespace-pre-wrap">
                {alert.message}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => alert.onClose?.()}>{UI_LABELS.CONFIRM}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmDialogComponent() {
  const { confirm } = useDialogStore()
  const config = typeConfig[confirm.type]

  // 根據是否有 HTML 內容決定對話框寬度
  const dialogWidth = confirm.htmlContent ? 'max-w-2xl' : 'max-w-md'

  return (
    <Dialog open={confirm.isOpen} onOpenChange={open => !open && confirm.onCancel?.()}>
      {/* 使用 level={4} 確保全局對話框始終在最上層 */}
      <DialogContent level={4} className={dialogWidth}>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`${config.bgColor} ${config.color} p-2 rounded-lg`}>{config.icon}</div>
            <div className="flex-1">
              <DialogTitle className={confirm.title ? 'text-morandi-primary mb-2' : 'sr-only'}>
                {confirm.title || '確認'}
              </DialogTitle>
              <DialogDescription className="text-morandi-secondary whitespace-pre-wrap">
                {confirm.message}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {/* HTML 內容區域 */}
        {confirm.htmlContent && (
          <div
            className="mt-2"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(confirm.htmlContent) }}
          />
        )}
        <DialogFooter className="gap-2">
          <Button
            variant="soft-gold"
            onClick={() => confirm.onCancel?.()}
            className="border-border hover:border-morandi-gold/20"
          >
            {confirm.cancelText}
          </Button>
          {confirm.showThirdOption && (
            <Button
              variant="soft-gold"
              onClick={() => confirm.onThirdOption?.()}
              className="border-morandi-gold/30 hover:border-morandi-gold/50 text-morandi-secondary"
            >
              {confirm.thirdOptionText}
            </Button>
          )}
          <Button onClick={() => confirm.onConfirm?.()}>{confirm.confirmText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PromptDialogComponent() {
  const { prompt, setPromptValue } = useDialogStore()

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && prompt.value.trim()) {
      prompt.onConfirm?.(prompt.value)
    }
  }

  return (
    <Dialog open={prompt.isOpen} onOpenChange={open => !open && prompt.onCancel?.()}>
      <DialogContent level={4} className="max-w-md">
        <DialogHeader>
          <DialogTitle className={prompt.title ? 'text-morandi-primary' : 'sr-only'}>
            {prompt.title || '輸入'}
          </DialogTitle>
          <DialogDescription className="text-morandi-secondary">{prompt.message}</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Input
            type={prompt.inputType || 'text'}
            value={prompt.value}
            onChange={e => setPromptValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={prompt.placeholder}
            className="border-border focus:border-morandi-gold focus:ring-morandi-gold/20"
            autoFocus
          />
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="soft-gold"
            onClick={() => prompt.onCancel?.()}
            className="border-border hover:border-morandi-gold/20"
          >
            {prompt.cancelText}
          </Button>
          <Button
            onClick={() => prompt.onConfirm?.(prompt.value)}
            disabled={!prompt.value.trim()}
            className="disabled:opacity-50"
          >
            {prompt.confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 全局對話框容器
export function GlobalDialogs() {
  return (
    <>
      <AlertDialogComponent />
      <ConfirmDialogComponent />
      <PromptDialogComponent />
    </>
  )
}

// 導出易用的 API
export const alert = (message: string, type: AlertType = 'info', title?: string) => {
  return useDialogStore.getState().showAlert(message, type, title)
}

export const confirm = (
  message: string,
  typeOrOptions?:
    | AlertType
    | {
        type?: AlertType
        title?: string
        htmlContent?: string
        confirmText?: string
        cancelText?: string
        showThirdOption?: boolean
        thirdOptionText?: string
      },
  htmlContent?: string
) => {
  // 支援簡易呼叫: confirm(message, type, htmlContent)
  if (typeof typeOrOptions === 'string') {
    return useDialogStore.getState().showConfirm(message, {
      type: typeOrOptions,
      htmlContent,
    })
  }
  return useDialogStore.getState().showConfirm(message, typeOrOptions)
}

export const prompt = (
  message: string,
  options?: {
    title?: string
    placeholder?: string
    defaultValue?: string
    inputType?: 'text' | 'password'
    confirmText?: string
    cancelText?: string
  }
) => {
  return useDialogStore.getState().showPrompt(message, options)
}

// 便捷方法
export const alertSuccess = (message: string, title?: string) => alert(message, 'success', title)
export const alertError = (message: string, title?: string) => alert(message, 'error', title)
const _alertWarning = (message: string, title?: string) => alert(message, 'warning', title)
const _alertInfo = (message: string, title?: string) => alert(message, 'info', title)
