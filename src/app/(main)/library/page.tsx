'use client'

import { useRouter } from 'next/navigation'
import { Building2, MapPin, Archive, Contact } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { cn } from '@/lib/utils'

export default function LibraryPage() {
  const router = useRouter()
  const t = useTranslations('library')

  const libraryModules = [
    {
      id: 'attractions',
      title: t('moduleAttractions'),
      description: t('moduleAttractionsDesc'),
      icon: MapPin,
      href: '/library/attractions',
      color: 'bg-status-info',
    },
    {
      id: 'suppliers',
      title: t('moduleSuppliers'),
      description: t('moduleSuppliersDesc'),
      icon: Building2,
      href: '/library/suppliers',
      color: 'bg-status-info',
    },
    {
      id: 'archive-management',
      title: t('moduleArchive'),
      description: t('moduleArchiveDesc'),
      icon: Archive,
      href: '/library/archive-management',
      color: 'bg-morandi-red',
    },
    {
      id: 'customers',
      title: t('moduleCustomers'),
      description: t('moduleCustomersDesc'),
      icon: Contact,
      href: '/library/customers',
      color: 'bg-status-info',
    },
  ]

  return (
    <ContentPageLayout title={t('pageTitle')}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
        {libraryModules.map(module => {
          const Icon = module.icon
          return (
            <div
              key={module.id}
              onClick={() => router.push(module.href)}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-morandi-gold/20"
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-lg flex items-center justify-center mb-4',
                  module.color
                )}
              >
                <Icon size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-medium text-morandi-primary mb-2">{module.title}</h3>
              <p className="text-sm text-morandi-secondary">{module.description}</p>
            </div>
          )
        })}
      </div>
    </ContentPageLayout>
  )
}
