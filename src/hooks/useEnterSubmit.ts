import { KeyboardEvent, useState, useCallback } from 'react'

/**
 * 統一的 Enter 鍵提交處理 Hook（支援中文輸入法）
 *
 * 使用方式：
 * const { handleKeyDown, compositionProps } = useEnterSubmit(handleSubmit);
 * <Input onKeyDown={handleKeyDown} {...compositionProps} />
 */
function _useEnterSubmit(onSubmit: () => void) {
  const [isComposing, setIsComposing] = useState(false)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      // 如果正在使用輸入法（如注音、拼音），不要觸發提交
      if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
        e.preventDefault()
        onSubmit()
      }
    },
    [onSubmit, isComposing]
  )

  const compositionProps = {
    onCompositionStart: () => setIsComposing(true),
    onCompositionEnd: () => setIsComposing(false),
  }

  return { handleKeyDown, compositionProps }
}

/**
 * 支援 Shift+Enter 換行的版本 (用於 Textarea，支援中文輸入法)
 *
 * 使用方式：
 * const { handleKeyDown, compositionProps } = useEnterSubmitWithShift(handleSubmit);
 * <Textarea onKeyDown={handleKeyDown} {...compositionProps} />
 */
export function useEnterSubmitWithShift(onSubmit: () => void) {
  const [isComposing, setIsComposing] = useState(false)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Shift+Enter = 換行，Enter = 提交
      // 如果正在使用輸入法（如注音、拼音），不要觸發提交
      if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
        e.preventDefault()
        onSubmit()
      }
    },
    [onSubmit, isComposing]
  )

  const compositionProps = {
    onCompositionStart: () => setIsComposing(true),
    onCompositionEnd: () => setIsComposing(false),
  }

  return { handleKeyDown, compositionProps }
}
