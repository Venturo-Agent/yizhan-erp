'use client'

import { useRouter } from 'next/navigation'
import { Landmark, Globe, Plane } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { cn } from '@/lib/utils'

export default function SharedDataPage() {
  const router = useRouter()
  const t = useTranslations('sharedData')

  const sharedDataModules = [
    {
      id: 'banks',
      title: t('moduleBanks'),
      description: t('moduleBanksDesc'),
      icon: Landmark,
      href: '/shared-data/banks',
      color: 'bg-status-info',
    },
    {
      id: 'countries',
      title: t('moduleCountries'),
      description: t('moduleCountriesDesc'),
      icon: Globe,
      href: '/shared-data/countries',
      color: 'bg-status-success',
    },
    {
      id: 'airports',
      title: t('moduleAirports'),
      description: t('moduleAirportsDesc'),
      icon: Plane,
      href: '/shared-data/airports',
      color: 'bg-morandi-blue',
    },
  ]

  return (
    <ContentPageLayout title={t('title')}>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {sharedDataModules.map(m => {
          const Icon = m.icon
          return (
            <button
              key={m.id}
              type='button'
              onClick={() => router.push(m.href)}
              className='group flex flex-col items-start gap-3 rounded-lg border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-md'
            >
              <div className={cn('rounded-md p-3 text-white', m.color)}>
                <Icon className='size-6' />
              </div>
              <div>
                <h3 className='text-lg font-semibold group-hover:text-primary'>{m.title}</h3>
                <p className='mt-1 text-sm text-muted-foreground'>{m.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </ContentPageLayout>
  )
}
