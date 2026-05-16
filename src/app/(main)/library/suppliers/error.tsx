'use client'

import { ModuleError } from '@/components/module-error'

export default function LibrarySuppliersError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ModuleError error={error} reset={reset} moduleName="LibrarySuppliers" />
}
