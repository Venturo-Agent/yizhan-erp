'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { EmptyValue } from '@/components/ui/empty-value'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AttractionFormData } from '../../_types'
import type { Country, Region, City } from '@/stores/region-store'
import { CoordinateSearch } from './CoordinateSearch'

const COMPONENT_LABELS = {
  CAT_ATTRACTION: '景點',
  CAT_RESTAURANT: '餐廳',
  CAT_LODGING: '住宿',
  CAT_SHOPPING: '購物',
  CAT_TRANSPORT: '交通',
  COORDINATE: '座標',
} as const

interface AttractionFormProps {
  formData: AttractionFormData
  countries: Country[]
  availableRegions: Region[]
  availableCities: City[]
  onFormDataChange: (formData: AttractionFormData) => void
  /** 唯讀模式（無編輯權限時） */
  readOnly?: boolean
  /** 放在左欄底部的額外內容（如圖片上傳） */
  children?: React.ReactNode
}

export function AttractionForm({
  formData,
  countries,
  availableRegions,
  availableCities,
  onFormDataChange,
  readOnly = false,
  children,
}: AttractionFormProps) {
  const t = useTranslations('library')
  const setFormData = (updater: (prev: AttractionFormData) => AttractionFormData) => {
    onFormDataChange(updater(formData))
  }

  const [polishingField, setPolishingField] = useState<'description' | 'notes' | null>(null)

  const handleAiPolish = async (field: 'description' | 'notes') => {
    if (!formData.name.trim()) {
      toast.warning('請先填寫景點名稱')
      return
    }
    setPolishingField(field)
    try {
      const res = await fetch('/api/shared-data/attractions/ai-polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          field,
          currentContent: field === 'description' ? formData.description : formData.notes,
        }),
      })
      const data = (await res.json()) as { polished?: string; error?: string }
      if (!res.ok || !data.polished) {
        toast.error(data.error ?? 'AI 潤飾失敗，請稍後再試')
        return
      }
      setFormData(prev => ({ ...prev, [field]: data.polished! }))
      toast.success('AI 潤飾完成，請確認內容後儲存')
    } catch {
      toast.error('AI 潤飾失敗，請稍後再試')
    } finally {
      setPolishingField(null)
    }
  }

  const country = countries.find(c => c.id === formData.country_id)
  const region = availableRegions.find(r => r.id === formData.region_id)
  const city = availableCities.find(c => c.id === formData.city_id)

  // 唯讀欄位樣式
  const _readOnlyClass = 'bg-muted/50 cursor-default pointer-events-none'

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
      {/* ====== 左欄 ====== */}
      <div className="space-y-3">
        {/* 名稱 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">{t('attractionFormNameZh')}</label>
            {readOnly ? (
              <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                {formData.name || <EmptyValue />}
              </div>
            ) : (
              <Input
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('attractionFormExampleZh')}
                required
              />
            )}
          </div>
          <div>
            <label className="text-sm font-medium">{t('attractionFormNameEn')}</label>
            {readOnly ? (
              <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                {formData.english_name || <EmptyValue />}
              </div>
            ) : (
              <Input
                value={formData.english_name}
                onChange={e => setFormData(prev => ({ ...prev, english_name: e.target.value }))}
                placeholder={t('attractionFormExampleEn')}
              />
            )}
          </div>
        </div>

        {/* 描述 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium">{t('attractionFormDescription')}</label>
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleAiPolish('description')}
                disabled={polishingField !== null}
                className="h-6 px-2 text-xs text-morandi-gold hover:bg-morandi-gold/10 gap-1"
              >
                {polishingField === 'description' ? <Spinner size="sm" /> : <Sparkles size={12} />}
                AI 潤飾
              </Button>
            )}
          </div>
          {readOnly ? (
            <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50 min-h-[68px] whitespace-pre-wrap">
              {formData.description || <EmptyValue />}
            </div>
          ) : (
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t('attractionFormDescriptionPlaceholder')}
              className="w-full px-3 py-2 border border-border rounded-md bg-card text-sm min-h-[68px]"
            />
          )}
        </div>

        {/* 地點 */}
        <div
          className={`grid gap-3 ${availableRegions.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}
        >
          <div>
            <label className="text-sm font-medium">{t('attractionFormCountry')}</label>
            {readOnly ? (
              <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                {country?.name || <EmptyValue />}
              </div>
            ) : (
              <Select
                value={formData.country_id}
                onValueChange={value =>
                  setFormData(prev => ({ ...prev, country_id: value, region_id: '', city_id: '' }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('attractionFormSelectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {availableRegions.length > 0 && (
            <div>
              <label className="text-sm font-medium">{t('attractionFormRegion')}</label>
              {readOnly ? (
                <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                  {region?.name || <EmptyValue />}
                </div>
              ) : (
                <Select
                  value={formData.region_id}
                  onValueChange={value =>
                    setFormData(prev => ({ ...prev, region_id: value, city_id: '' }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('attractionFormSelectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRegions.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">{t('attractionFormCity')}</label>
            {readOnly ? (
              <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                {city?.name || '不指定'}
              </div>
            ) : (
              <Select
                value={formData.city_id || '_none_'}
                onValueChange={value =>
                  setFormData(prev => ({ ...prev, city_id: value === '_none_' ? '' : value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('attractionFormNotSpecified')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">{t('attractionFormNotSpecified')}</SelectItem>
                  {availableCities.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* 類別 + 標籤 + 時間 */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium">{t('attractionFormCategory')}</label>
            {readOnly ? (
              <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                {formData.category || <EmptyValue />}
              </div>
            ) : (
              <Select
                value={formData.category}
                onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={'景點'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={'景點'}>{COMPONENT_LABELS.CAT_ATTRACTION}</SelectItem>
                  <SelectItem value={'餐廳'}>{COMPONENT_LABELS.CAT_RESTAURANT}</SelectItem>
                  <SelectItem value={'住宿'}>{COMPONENT_LABELS.CAT_LODGING}</SelectItem>
                  <SelectItem value={'購物'}>{COMPONENT_LABELS.CAT_SHOPPING}</SelectItem>
                  <SelectItem value={'交通'}>{COMPONENT_LABELS.CAT_TRANSPORT}</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">{t('attractionFormTags')}</label>
            {readOnly ? (
              <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                {formData.tags
                  ? formData.tags.split(',').map((t, i) => (
                      <span
                        key={i}
                        className="inline-block px-1.5 py-0.5 mr-1 bg-morandi-gold/10 text-morandi-gold rounded text-xs"
                      >
                        {t.trim()}
                      </span>
                    ))
                  : '-'}
              </div>
            ) : (
              <Input
                value={formData.tags}
                onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder={t('attractionFormTagsPlaceholder')}
              />
            )}
          </div>
          <div>
            <label className="text-sm font-medium">{t('attractionFormDuration')}</label>
            {readOnly ? (
              <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                {formData.duration_minutes} {t('attractionFormMinutesUnit')}
              </div>
            ) : (
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={e =>
                  setFormData(prev => ({ ...prev, duration_minutes: Number(e.target.value) }))
                }
                min={0}
              />
            )}
          </div>
        </div>

        {/* 圖片上傳（從 children 傳入） */}
        {children}
      </div>

      {/* ====== 右欄 ====== */}
      <div className="space-y-3">
        {/* 聯絡資訊 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">{t('attractionFormPhone')}</label>
            {readOnly ? (
              <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                {formData.phone || <EmptyValue />}
              </div>
            ) : (
              <Input
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+81-92-123-4567"
              />
            )}
          </div>
          <div>
            <label className="text-sm font-medium">{t('attractionFormWebsite')}</label>
            {readOnly ? (
              <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
                {formData.website ? (
                  <a
                    href={formData.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-morandi-gold hover:underline truncate block"
                  >
                    {formData.website}
                  </a>
                ) : (
                  '-'
                )}
              </div>
            ) : (
              <Input
                value={formData.website}
                onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://..."
              />
            )}
          </div>
        </div>

        {/* 地址 */}
        <div>
          <label className="text-sm font-medium">{t('attractionFormAddress')}</label>
          {readOnly ? (
            <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50">
              {formData.address || <EmptyValue />}
            </div>
          ) : (
            <Input
              value={formData.address}
              onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder={t('attractionFormAddressPlaceholder')}
            />
          )}
        </div>

        {/* 座標搜尋 */}
        <div>
          <label className="text-sm font-medium mb-2 block">{COMPONENT_LABELS.COORDINATE}</label>
          <CoordinateSearch
            attractionName={formData.name}
            city={city?.name}
            country={country?.name}
            currentLat={formData.latitude}
            currentLng={formData.longitude}
            onCoordsUpdate={(lat, lng, address) => {
              setFormData(prev => ({
                ...prev,
                latitude: lat,
                longitude: lng,
                ...(address && !prev.address ? { address } : {}), // 如果沒有地址，自動填入
              }))
            }}
            readOnly={readOnly}
          />
        </div>

        {/* 備註 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium">{t('attractionFormInternalNotes')}</label>
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleAiPolish('notes')}
                disabled={polishingField !== null}
                className="h-6 px-2 text-xs text-morandi-gold hover:bg-morandi-gold/10 gap-1"
              >
                {polishingField === 'notes' ? <Spinner size="sm" /> : <Sparkles size={12} />}
                AI 潤飾
              </Button>
            )}
          </div>
          {readOnly ? (
            <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted/50 min-h-[68px] whitespace-pre-wrap">
              {formData.notes || <EmptyValue />}
            </div>
          ) : (
            <textarea
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={t('attractionFormNotesPlaceholder')}
              className="w-full px-3 py-2 border border-border rounded-md bg-card text-sm min-h-[68px]"
            />
          )}
        </div>

        {/* 啟用狀態 */}
        <div className="flex items-center gap-2">
          <Checkbox
            checked={formData.is_active}
            onCheckedChange={checked =>
              setFormData(prev => ({ ...prev, is_active: checked as boolean }))
            }
            disabled={readOnly}
          />
          <label className="text-sm">{t('attractionFormEnable')}</label>
        </div>
      </div>
    </div>
  )
}
