'use client'

import { ModuleError } from '@/components/module-error'

export default function TodosError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ModuleError error={error} reset={reset} moduleName="Todos" />
}
