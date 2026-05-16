'use client'

import { useMyCapabilities } from './useMyCapabilities'
import type { Capability } from './capabilities'

/**
 * Capability hook wrapper、提供 can / hasAny / hasAll / canRead / canWrite 介面
 */
export function useCapabilities() {
  const { has, loading, canReadAnyInModule, canWriteAnyInModule } = useMyCapabilities()

  const can = (capability: Capability): boolean => has(capability)

  const hasAny = (caps: Capability[]): boolean => caps.some(c => has(c))
  const hasAll = (caps: Capability[]): boolean => caps.every(c => has(c))

  return {
    can,
    hasAny,
    hasAll,
    loading,
    canRead: (moduleCode: string, tabCode?: string) =>
      has(tabCode ? `${moduleCode}.${tabCode}.read` : `${moduleCode}.read`),
    canWrite: (moduleCode: string, tabCode?: string) =>
      has(tabCode ? `${moduleCode}.${tabCode}.write` : `${moduleCode}.write`),
    canReadAny: canReadAnyInModule,
    canWriteAny: canWriteAnyInModule,
  }
}
