'use client'

// src/lib/swr/provider.tsx
// SWR Provider 組件

import { SWRConfig } from 'swr'
import { swrConfig } from './config'

interface SWRProviderProps {
  children: React.ReactNode
}

/**
 * SWR Provider
 * 提供全域快取設定和 localStorage 持久化
 *
 * 使用方式：在 app/layout.tsx 中包裹應用
 * ```tsx
 * <SWRProvider>
 *   {children}
 * </SWRProvider>
 * ```
 */
export function SWRProvider({ children }: SWRProviderProps) {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>
}

