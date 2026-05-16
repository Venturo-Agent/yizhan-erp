'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/utils/logger'

export default function CisDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('cis')
  useEffect(() => {
    logger.error('[CIS detail error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <h2 className="text-lg font-medium text-morandi-primary">{t('customerLoadFailed')}</h2>
      <p className="text-sm text-morandi-secondary">{error.message}</p>
      <Button onClick={reset} variant="soft-gold">
        重試
      </Button>
    </div>
  )
}
