'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { COMPONENT_LABELS } from './constants/labels'

interface ModuleErrorProps {
  error: Error & { digest?: string }
  reset: () => void
  moduleName?: string
}

export function ModuleError({ error, reset, moduleName }: ModuleErrorProps) {
  useEffect(() => {
    logger.error(`[${moduleName ?? 'Module'}] Error:`, error)
  }, [error, moduleName])

  return (
    <div className="flex flex-col items-center justify-center min-h-[25rem] gap-4 p-6">
      <div className="rounded-full bg-status-danger-bg p-4">
        <AlertTriangle className="h-8 w-8 text-status-danger" />
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{COMPONENT_LABELS.LABEL_5959}</h2>
        <p className="text-sm text-muted-foreground">{COMPONENT_LABELS.LABEL_113}</p>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <p className="text-xs font-mono text-destructive max-w-md text-center break-words">
          {error.message}
        </p>
      )}
      <Button onClick={reset} size="sm" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        {COMPONENT_LABELS.LABEL_8105}
      </Button>
    </div>
  )
}
