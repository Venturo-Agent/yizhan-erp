import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { KeyboardEvent } from 'react'
import { useEnterSubmitWithShift } from '@/hooks/useEnterSubmit'

/**
 * 建一個假的 KeyboardEvent、只放本 hook 會用到的欄位。
 */
function makeKeyEvent(opts: {
  key: string
  shiftKey?: boolean
}): KeyboardEvent<HTMLTextAreaElement> {
  const preventDefault = vi.fn()
  return {
    key: opts.key,
    shiftKey: opts.shiftKey ?? false,
    preventDefault,
  } as unknown as KeyboardEvent<HTMLTextAreaElement>
}

describe('useEnterSubmitWithShift', () => {
  it('Enter 觸發 onSubmit 並 preventDefault', () => {
    const onSubmit = vi.fn()
    const { result } = renderHook(() => useEnterSubmitWithShift(onSubmit))

    const e = makeKeyEvent({ key: 'Enter' })
    act(() => {
      result.current.handleKeyDown(e)
    })

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(e.preventDefault).toHaveBeenCalledTimes(1)
  })

  it('Shift+Enter 不應提交（換行）', () => {
    const onSubmit = vi.fn()
    const { result } = renderHook(() => useEnterSubmitWithShift(onSubmit))

    const e = makeKeyEvent({ key: 'Enter', shiftKey: true })
    act(() => {
      result.current.handleKeyDown(e)
    })

    expect(onSubmit).not.toHaveBeenCalled()
    expect(e.preventDefault).not.toHaveBeenCalled()
  })

  it('其他按鍵不觸發 onSubmit', () => {
    const onSubmit = vi.fn()
    const { result } = renderHook(() => useEnterSubmitWithShift(onSubmit))

    for (const key of ['a', 'Tab', 'Escape', ' ', 'ArrowDown']) {
      const e = makeKeyEvent({ key })
      act(() => {
        result.current.handleKeyDown(e)
      })
      expect(e.preventDefault).not.toHaveBeenCalled()
    }
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('輸入法 composition 中按 Enter 不應提交（中文輸入確認）', () => {
    const onSubmit = vi.fn()
    const { result } = renderHook(() => useEnterSubmitWithShift(onSubmit))

    // 模擬輸入法開始
    act(() => {
      result.current.compositionProps.onCompositionStart()
    })

    const eDuringComp = makeKeyEvent({ key: 'Enter' })
    act(() => {
      result.current.handleKeyDown(eDuringComp)
    })

    expect(onSubmit).not.toHaveBeenCalled()
    expect(eDuringComp.preventDefault).not.toHaveBeenCalled()

    // 結束 composition、再按 Enter 應觸發
    act(() => {
      result.current.compositionProps.onCompositionEnd()
    })

    const eAfter = makeKeyEvent({ key: 'Enter' })
    act(() => {
      result.current.handleKeyDown(eAfter)
    })

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(eAfter.preventDefault).toHaveBeenCalledTimes(1)
  })

  it('多次 Enter 應多次呼叫 onSubmit', () => {
    const onSubmit = vi.fn()
    const { result } = renderHook(() => useEnterSubmitWithShift(onSubmit))

    act(() => {
      result.current.handleKeyDown(makeKeyEvent({ key: 'Enter' }))
      result.current.handleKeyDown(makeKeyEvent({ key: 'Enter' }))
      result.current.handleKeyDown(makeKeyEvent({ key: 'Enter' }))
    })

    expect(onSubmit).toHaveBeenCalledTimes(3)
  })

  it('rerender 換 onSubmit 後 handleKeyDown 應呼叫最新的 callback', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { result, rerender } = renderHook(({ fn }) => useEnterSubmitWithShift(fn), {
      initialProps: { fn: first },
    })

    rerender({ fn: second })

    act(() => {
      result.current.handleKeyDown(makeKeyEvent({ key: 'Enter' }))
    })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('compositionProps 提供 onCompositionStart / onCompositionEnd', () => {
    const onSubmit = vi.fn()
    const { result } = renderHook(() => useEnterSubmitWithShift(onSubmit))

    expect(typeof result.current.compositionProps.onCompositionStart).toBe('function')
    expect(typeof result.current.compositionProps.onCompositionEnd).toBe('function')
  })
})
