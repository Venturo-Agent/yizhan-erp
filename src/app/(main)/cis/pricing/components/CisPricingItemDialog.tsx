'use client'

import { useEffect, useState } from 'react'
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

import { EntityFormDialog } from '@/components/shared/EntityFormDialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

import type {
  CisPricingItem,
  CisPricingCategory,
  CreateCisPricingItemData,
} from '@/types/cis.types'
import { CIS_PRICING_CATEGORY_OPTIONS } from '@/types/cis.types'

const PAGE_LABELS = {
  ITEM_NAME_REQUIRED: '項目名稱必填',
} as const

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  initialItem: CisPricingItem | null
  onSubmit: (data: CreateCisPricingItemData) => Promise<void>
}

interface FormState {
  code: string
  category: CisPricingCategory
  name: string
  description: string
  unit: string
  price_low: string
  price_high: string
  match_keywords_text: string
  sort_order: string
  is_active: boolean
  notes: string
}

const EMPTY: FormState = {
  code: '',
  category: 'other',
  name: '',
  description: '',
  unit: '式',
  price_low: '',
  price_high: '',
  match_keywords_text: '',
  sort_order: '100',
  is_active: true,
  notes: '',
}

function fromItem(i: CisPricingItem | null): FormState {
  if (!i) return { ...EMPTY }
  return {
    code: i.code || '',
    category: i.category,
    name: i.name || '',
    description: i.description || '',
    unit: i.unit || '式',
    price_low: i.price_low != null ? String(i.price_low) : '',
    price_high: i.price_high != null ? String(i.price_high) : '',
    match_keywords_text: (i.match_keywords || []).join('、'),
    sort_order: String(i.sort_order ?? 100),
    is_active: i.is_active,
    notes: i.notes || '',
  }
}

export function CisPricingItemDialog({
  open,
  onOpenChange,
  mode,
  initialItem,
  onSubmit,
}: Props) {
  const t = useTranslations('cis')
  const [form, setForm] = useState<FormState>(EMPTY)

  useEffect(() => {
    if (open) setForm(fromItem(initialItem))
  }, [open, initialItem])

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  const { isSubmitting, execute: handleSubmit } = useAsyncSubmit(
    async () => {
      if (!form.name.trim()) {
        toast.error(PAGE_LABELS.ITEM_NAME_REQUIRED)
        return
      }
      const keywords = form.match_keywords_text
        .split(/[,，、\s]+/)
        .map(s => s.trim())
        .filter(Boolean)

      const payload: CreateCisPricingItemData = {
        code: form.code.trim() || undefined,
        category: form.category,
        name: form.name.trim(),
        description: form.description.trim() || null,
        unit: form.unit.trim() || '式',
        price_low: form.price_low ? Number(form.price_low) : null,
        price_high: form.price_high ? Number(form.price_high) : null,
        match_keywords: keywords,
        sort_order: Number(form.sort_order) || 100,
        is_active: form.is_active,
        notes: form.notes.trim() || null,
      }

      await onSubmit(payload)
      toast.success(mode === 'create' ? t('pricingToastCreateSuccess') : t('pricingToastUpdateSuccess'))
      onOpenChange(false)
    },
    { onError: () => toast.error(t('pricingSaveFailed')) }
  )

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={v => (!isSubmitting ? onOpenChange(v) : undefined)}
      title="衍生項目"
      entity={initialItem}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitDisabled={!form.name.trim()}
      maxWidth="2xl"
    >
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-3 gap-3">
            <Field label={t('pricingLabelCode')}>
              <Input
                value={form.code}
                onChange={e => update('code', e.target.value)}
                placeholder={t('pricingPlaceholderCode')}
                disabled={isSubmitting}
              />
            </Field>
            <Field label={t('pricingLabelCategory')}>
              <select
                value={form.category}
                onChange={e => update('category', e.target.value as CisPricingCategory)}
                disabled={isSubmitting}
                className="h-9 px-2 rounded-md border border-morandi-muted/40 bg-background text-sm text-morandi-primary focus:outline-none focus:ring-1 focus:ring-morandi-gold/40"
              >
                {CIS_PRICING_CATEGORY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('pricingLabelUnit')}>
              <Input
                value={form.unit}
                onChange={e => update('unit', e.target.value)}
                placeholder={t('pricingPlaceholderUnit')}
                disabled={isSubmitting}
              />
            </Field>
          </div>

          <Field label={`${t('pricingLabelName')} *`}>
            <Input
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder={t('pricingPlaceholderName')}
              disabled={isSubmitting}
              autoFocus
            />
          </Field>

          <Field label={t('pricingLabelDescription')}>
            <Textarea
              value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder={t('pricingPlaceholderDescription')}
              disabled={isSubmitting}
              rows={2}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label={t('pricingLabelPriceLow')}>
              <Input
                type="number"
                value={form.price_low}
                onChange={e => update('price_low', e.target.value)}
                placeholder={t('pricingPlaceholderPriceLow')}
                disabled={isSubmitting}
              />
            </Field>
            <Field label={t('pricingLabelPriceHigh')}>
              <Input
                type="number"
                value={form.price_high}
                onChange={e => update('price_high', e.target.value)}
                placeholder={t('pricingPlaceholderPriceHigh')}
                disabled={isSubmitting}
              />
            </Field>
            <Field label={t('pricingLabelSort')}>
              <Input
                type="number"
                value={form.sort_order}
                onChange={e => update('sort_order', e.target.value)}
                disabled={isSubmitting}
              />
            </Field>
          </div>

          <Field label={t('pricingLabelMatchKeywords')}>
            <Input
              value={form.match_keywords_text}
              onChange={e => update('match_keywords_text', e.target.value)}
              placeholder={t('pricingPlaceholderKeywords')}
              disabled={isSubmitting}
            />
          </Field>

          <Field label={t('pricingLabelNotes')}>
            <Textarea
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              disabled={isSubmitting}
              rows={2}
            />
          </Field>

          <label className="flex items-center gap-2 text-xs text-morandi-primary">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => update('is_active', e.target.checked)}
              disabled={isSubmitting}
            />
            {t('pricingLabelIsActive')}
          </label>
        </div>

    </EntityFormDialog>
  )
}

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`grid gap-1.5 ${className || ''}`}>
      <Label className="text-xs text-morandi-primary">{label}</Label>
      {children}
    </div>
  )
}
