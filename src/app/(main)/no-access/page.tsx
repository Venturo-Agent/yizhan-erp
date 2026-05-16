'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ShieldX, ArrowLeft, Home } from 'lucide-react'

export default function NoAccessPage() {
  const t = useTranslations('noAccess')
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-morandi-background p-4">
      <Card className="w-full max-w-md p-8 text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-status-danger-bg rounded-full flex items-center justify-center">
          <ShieldX size={40} className="text-status-danger" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-morandi-primary">{t('accessDenied')}</h1>
          <p className="text-morandi-secondary">{t('noPermission')}</p>
        </div>

        <div className="space-y-3">
          <Button onClick={() => router.back()} variant="soft-gold" className="w-full gap-2">
            <ArrowLeft size={16} />
            {t('goBack')}
          </Button>

          <Button onClick={() => router.push('/dashboard')} className="w-full gap-2">
            <Home size={16} />
            {t('backToHome')}
          </Button>
        </div>

        <p className="text-xs text-morandi-muted">{t('contactAdmin')}</p>
      </Card>
    </div>
  )
}
