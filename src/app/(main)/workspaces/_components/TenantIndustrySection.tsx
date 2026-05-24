'use client'

/**
 * TenantIndustrySection — 產業分類選擇區塊
 * 觀光產業 → 再細選：旅遊業 / 遊覽車行 / 地接社
 * 美業 → 再細選：按摩 / 美髮 / 美甲
 * 一般產業 → 暫時不細分
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslations } from 'next-intl'
import type { Industry, SubIndustry } from './create-tenant-types'

interface Props {
  industry: Industry | ''
  subIndustry: SubIndustry
  onIndustryChange: (industry: Industry | '') => void
  onSubIndustryChange: (subIndustry: SubIndustry) => void
}

export function TenantIndustrySection({
  industry,
  subIndustry,
  onIndustryChange,
  onSubIndustryChange,
}: Props) {
  const t = useTranslations('workspacesPage')

  return (
    <section className="space-y-3">
      <p className="text-sm text-morandi-secondary">{t('industrySectionTitle')}</p>

      {/* 第一層：產業 */}
      <div>
        <label className="text-sm font-medium text-morandi-primary mb-1.5 block">
          {t('fieldIndustry')}
          <span className="text-morandi-red">{t('fieldRequired')}</span>
        </label>
        <Select
          value={industry}
          onValueChange={val => onIndustryChange(val as Industry)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('fieldIndustryPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tourism">{t('industryTourism')}</SelectItem>
            <SelectItem value="beauty">{t('industryBeauty')}</SelectItem>
            <SelectItem value="general">{t('industryGeneral')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 第二層：觀光產業 → 細分行業 */}
      {industry === 'tourism' && (
        <div>
          <label className="text-sm font-medium text-morandi-primary mb-1.5 block">
            {t('fieldSubIndustry')}
            <span className="text-morandi-red">{t('fieldRequired')}</span>
          </label>
          <Select
            value={subIndustry ?? ''}
            onValueChange={val => onSubIndustryChange(val as SubIndustry)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('fieldSubIndustryPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="travel_agency">{t('subIndustryTravelAgency')}</SelectItem>
              <SelectItem value="tour_bus">{t('subIndustryTourBus')}</SelectItem>
              <SelectItem value="local_agency">{t('subIndustryLocalAgency')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 第二層：美業 → 細分行業 */}
      {industry === 'beauty' && (
        <div>
          <label className="text-sm font-medium text-morandi-primary mb-1.5 block">
            {t('fieldSubIndustry')}
            <span className="text-morandi-red">{t('fieldRequired')}</span>
          </label>
          <Select
            value={subIndustry ?? ''}
            onValueChange={val => onSubIndustryChange(val as SubIndustry)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('fieldSubIndustryPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="massage">{t('subIndustryMassage')}</SelectItem>
              <SelectItem value="hair_salon">{t('subIndustryHairSalon')}</SelectItem>
              <SelectItem value="nails">{t('subIndustryNails')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 一般產業提示 */}
      {industry === 'general' && (
        <p className="text-xs text-morandi-muted">{t('industryGeneralHint')}</p>
      )}
    </section>
  )
}