'use client'

/**
 * TenantBrandSection — 品牌設定區塊
 */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { DimensionRow, FormData } from './create-tenant-types'

interface Props {
  brands: FormData['brands']
  onUpdate: (idx: number, field: keyof DimensionRow, value: string) => void
  onAdd: () => void
  onRemove: (idx: number) => void
}

export function TenantBrandSection({ brands, onUpdate, onAdd, onRemove }: Props) {
  const t = useTranslations('workspacesPage')
  return (
    <section className="space-y-3 pt-3 border-t border-morandi-container/40">
      <div>
        <h3 className="text-sm font-semibold text-morandi-primary">{t('sectionBrands')}</h3>
        <p className="text-xs text-morandi-muted">{t('sectionBrandsDesc')}</p>
      </div>

      <div className="space-y-2">
        {brands.map((b, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <Input
              value={b.name}
              onChange={e => onUpdate(idx, 'name', e.target.value)}
              placeholder={`${t('fieldBrandName')}${idx === 0 ? '（主要）' : ''}`}
              className="flex-1"
            />
            {brands.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(idx)}
                className="text-status-danger"
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button variant="soft-gold" size="sm" onClick={onAdd} type="button">
        {t('btnAddBrand')}
      </Button>
    </section>
  )
}
