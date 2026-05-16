'use client'

/**
 * 品牌資料卡填寫區塊
 *
 * 包含：品牌關鍵字 / 情感關鍵字 / 價值主張 / 差異化 /
 *       接觸點 / 色調 / 視覺風格 / 優先需求（必做/建議/可選）
 */

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useTranslations } from 'next-intl'
import { Field } from './CisVisitFormField'

interface BrandCardFields {
  brand_keywords_text: string
  emotional_keywords_text: string
  value_proposition: string
  differentiation: string
  touchpoints_text: string
  color_tone: string
  visual_style: string
  must_do_text: string
  suggested_text: string
  optional_text: string
}

interface CisVisitBrandCardSectionProps {
  fields: BrandCardFields
  disabled: boolean
  onChange: <K extends keyof BrandCardFields>(key: K, value: BrandCardFields[K]) => void
}

export function CisVisitBrandCardSection({
  fields,
  disabled,
  onChange,
}: CisVisitBrandCardSectionProps) {
  const t = useTranslations('cis')
  return (
    <section className="grid gap-3">
      <h3 className="text-xs font-semibold text-morandi-secondary uppercase tracking-wide">
        {t('visitSectionBrandCard')}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('visitLabelBrandKeywords')}>
          <Input
            value={fields.brand_keywords_text}
            onChange={e => onChange('brand_keywords_text', e.target.value)}
            placeholder={t('visitPlaceholderKeywords')}
            disabled={disabled}
          />
        </Field>
        <Field label={t('visitLabelEmotionalKeywords')}>
          <Input
            value={fields.emotional_keywords_text}
            onChange={e => onChange('emotional_keywords_text', e.target.value)}
            placeholder={t('visitPlaceholderKeywords')}
            disabled={disabled}
          />
        </Field>
        <Field label={t('visitLabelValueProposition')} className="col-span-2">
          <Input
            value={fields.value_proposition}
            onChange={e => onChange('value_proposition', e.target.value)}
            placeholder={t('visitPlaceholderValueProposition')}
            disabled={disabled}
          />
        </Field>
        <Field label={t('visitLabelDifferentiation')} className="col-span-2">
          <Textarea
            value={fields.differentiation}
            onChange={e => onChange('differentiation', e.target.value)}
            placeholder={t('visitPlaceholderDifferentiation')}
            disabled={disabled}
            rows={2}
          />
        </Field>
        <Field label={t('visitLabelTouchpoints')} className="col-span-2">
          <Input
            value={fields.touchpoints_text}
            onChange={e => onChange('touchpoints_text', e.target.value)}
            placeholder={t('visitPlaceholderTouchpoints')}
            disabled={disabled}
          />
        </Field>
        <Field label={t('visitLabelColorTone')}>
          <Input
            value={fields.color_tone}
            onChange={e => onChange('color_tone', e.target.value)}
            placeholder={t('visitPlaceholderColorTone')}
            disabled={disabled}
          />
        </Field>
        <Field label={t('visitLabelVisualStyle')}>
          <Input
            value={fields.visual_style}
            onChange={e => onChange('visual_style', e.target.value)}
            placeholder={t('visitPlaceholderVisualStyle')}
            disabled={disabled}
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label={t('visitLabelMustDo')}>
          <Input
            value={fields.must_do_text}
            onChange={e => onChange('must_do_text', e.target.value)}
            placeholder={t('visitPlaceholderItems')}
            disabled={disabled}
          />
        </Field>
        <Field label={t('visitLabelSuggested')}>
          <Input
            value={fields.suggested_text}
            onChange={e => onChange('suggested_text', e.target.value)}
            placeholder={t('visitPlaceholderItems')}
            disabled={disabled}
          />
        </Field>
        <Field label={t('visitLabelOptional')}>
          <Input
            value={fields.optional_text}
            onChange={e => onChange('optional_text', e.target.value)}
            placeholder={t('visitPlaceholderItems')}
            disabled={disabled}
          />
        </Field>
      </div>
    </section>
  )
}
