'use client'

// src/lib/swr/provider.tsx
// SWR Provider 組件

import { useLayoutEffect } from 'react'
import { SWRConfig, useSWRConfig } from 'swr'
import { swrConfig } from './config'
import { _setBoundMutate } from './scoped-mutate'

interface SWRProviderProps {
  children: React.ReactNode
}

/**
 * MutateBinder — 把 useSWRConfig().mutate（bound 到自訂 cache）寫進 scoped-mutate 的
 * module-level 變數。必須 render 在 <SWRConfig> 內部、否則 useSWRConfig 抓到的是預設 cache。
 *
 * 用 useLayoutEffect 而非 useEffect：保證在子節點的 effect / event handler 跑前就完成綁定、
 * 避免某些極端 race（譬如 React Suspense 邊界、首次 commit 後立刻寫入）。
 */
function MutateBinder(): null {
  const { mutate } = useSWRConfig()
  useLayoutEffect(() => {
    _setBoundMutate(mutate)
  }, [mutate])
  return null
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
  return (
    <SWRConfig value={swrConfig}>
      <MutateBinder />
      {children}
    </SWRConfig>
  )
}
