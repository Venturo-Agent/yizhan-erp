import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useResetOnTabChange } from '@/hooks/useResetOnTabChange'

describe('useResetOnTabChange', () => {
  it('should not call reset on initial mount', () => {
    const reset = vi.fn()
    renderHook(({ tab }) => useResetOnTabChange(tab, reset), {
      initialProps: { tab: 'group' },
    })

    expect(reset).not.toHaveBeenCalled()
  })

  it('should call reset when tab changes', () => {
    const reset = vi.fn()
    const { rerender } = renderHook(({ tab }) => useResetOnTabChange(tab, reset), {
      initialProps: { tab: 'group' },
    })

    rerender({ tab: 'company' })

    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('should not call reset when tab stays the same on rerender', () => {
    const reset = vi.fn()
    const { rerender } = renderHook(({ tab }) => useResetOnTabChange(tab, reset), {
      initialProps: { tab: 'group' },
    })

    rerender({ tab: 'group' })
    rerender({ tab: 'group' })

    expect(reset).not.toHaveBeenCalled()
  })

  it('should call reset multiple times across multiple tab changes', () => {
    const reset = vi.fn()
    const { rerender } = renderHook(({ tab }) => useResetOnTabChange(tab, reset), {
      initialProps: { tab: 'a' },
    })

    rerender({ tab: 'b' })
    rerender({ tab: 'c' })
    rerender({ tab: 'a' })

    expect(reset).toHaveBeenCalledTimes(3)
  })

  it('should not call reset when enabled is false (e.g. edit mode)', () => {
    const reset = vi.fn()
    const { rerender } = renderHook(
      ({ tab, enabled }) => useResetOnTabChange(tab, reset, enabled),
      {
        initialProps: { tab: 'group', enabled: false },
      }
    )

    rerender({ tab: 'company', enabled: false })
    rerender({ tab: 'group', enabled: false })

    expect(reset).not.toHaveBeenCalled()
  })

  it('should resume reset behavior when enabled flips from false to true', () => {
    const reset = vi.fn()
    const { rerender } = renderHook(
      ({ tab, enabled }) => useResetOnTabChange(tab, reset, enabled),
      {
        initialProps: { tab: 'group', enabled: false },
      }
    )

    // Disabled: tab change should not reset, and prevTabRef should track current
    rerender({ tab: 'company', enabled: false })
    expect(reset).not.toHaveBeenCalled()

    // Enable + same tab as last seen: no reset
    rerender({ tab: 'company', enabled: true })
    expect(reset).not.toHaveBeenCalled()

    // Now changing tab should trigger reset
    rerender({ tab: 'group', enabled: true })
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('should use the latest reset callback when tab changes', () => {
    const reset1 = vi.fn()
    const reset2 = vi.fn()
    const { rerender } = renderHook(({ tab, reset }) => useResetOnTabChange(tab, reset), {
      initialProps: { tab: 'a', reset: reset1 },
    })

    rerender({ tab: 'a', reset: reset2 })
    rerender({ tab: 'b', reset: reset2 })

    expect(reset1).not.toHaveBeenCalled()
    expect(reset2).toHaveBeenCalledTimes(1)
  })
})
