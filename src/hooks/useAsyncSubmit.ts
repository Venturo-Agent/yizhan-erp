'use client'
import { useState, useCallback } from 'react'

export function useAsyncSubmit<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options?: {
    onError?: (error: unknown) => void
    onSuccess?: (result: TResult) => void
  }
) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      setIsSubmitting(true)
      try {
        const result = await fn(...args)
        options?.onSuccess?.(result)
        return result
      } catch (error) {
        options?.onError?.(error)
        throw error
      } finally {
        setIsSubmitting(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn]
  )

  return { isSubmitting, execute }
}
