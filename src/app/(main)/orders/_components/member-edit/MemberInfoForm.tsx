'use client'
/**
 * MemberInfoForm - 成員基本資訊表單
 * 從 MemberEditDialog.tsx 拆分
 *
 * 效能/中文輸入修正（2026-05-26）：
 * 表單欄位改「本地草稿」。打字只更新本地 draft（只重繪這個小表單）、
 * 離開欄位（onBlur）才把值推回父層 onChange。
 * 原本每打一字就 onChange → 父層 setEditFormData → 整個 OrderMembersExpandable
 * + 整張成員表重繪、害中文輸入法組字被打斷、字越多越卡。
 * 儲存 / OCR 回填 / 從顧客同步仍透過 formData prop 進來、useEffect 會重新 seed 草稿。
 */

import React, { useEffect, useState } from 'react'
import type { EditFormData } from '../MemberEditDialog'
import { useTranslations } from 'next-intl'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

const COMPONENT_LABELS = {
  PRINT_LABEL: '(列印)',
} as const

// Radix Select 不允許 SelectItem value=""，用哨兵值代表「未選性別」（原 <option value="">），commit 時換回 ''
const GENDER_NONE = '__none__'

interface MemberInfoFormProps {
  formData: EditFormData
  onChange: (data: EditFormData) => void
}

export function MemberInfoForm({ formData, onChange }: MemberInfoFormProps) {
  const t = useTranslations('orders')
  const inputClass =
    'w-full px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-morandi-gold'
  const labelClass = 'block text-xs font-medium text-morandi-primary mb-1'

  // 本地草稿：打字只動這裡、不驚動父層（父層一動會連帶整張成員表重繪）
  const [draft, setDraft] = useState<EditFormData>(formData)

  // 外部資料變動（換成員、OCR 回填、從顧客同步）時重新 seed。
  // formData 是父層 useState、reference 只在 setEditFormData 時才變、打字當下不會誤觸。
  useEffect(() => {
    setDraft(formData)
  }, [formData])

  // 純文字欄位：onChange 只更新本地草稿、onBlur 才推回父層
  const setField = (field: keyof EditFormData, value: string) =>
    setDraft(prev => ({ ...prev, [field]: value }))
  const commit = () => onChange(draft)

  // 下拉（性別）：選了就直接推回父層、無組字/卡頓問題
  const commitNow = (next: EditFormData) => {
    setDraft(next)
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-morandi-primary">{t('memberEditTitle')}</h3>

      {/* 中文姓名 + 性別 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>{t('memberEditChineseName')}</label>
          <input
            type="text"
            value={draft.chinese_name || ''}
            onChange={e => setField('chinese_name', e.target.value)}
            onBlur={commit}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t('memberEditGender')}</label>
          <Select
            value={draft.gender || GENDER_NONE}
            onValueChange={v => commitNow({ ...draft, gender: v === GENDER_NONE ? '' : v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="-" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GENDER_NONE}>-</SelectItem>
              <SelectItem value="M">{t('memberEditMale')}</SelectItem>
              <SelectItem value="F">{t('memberEditFemale')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 護照拼音 + 吊牌拼音 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>{t('memberEditPassportName')}</label>
          <input
            type="text"
            value={draft.passport_name || ''}
            onChange={e => setField('passport_name', e.target.value)}
            onBlur={commit}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            {t('memberEditTagPinyin')}
            <span className="text-morandi-muted font-normal ml-1 text-[0.588rem]">
              {COMPONENT_LABELS.PRINT_LABEL}
            </span>
          </label>
          <input
            type="text"
            value={draft.passport_name_print || ''}
            onChange={e => setField('passport_name_print', e.target.value)}
            onBlur={commit}
            placeholder={t('memberEditPlaceholderPassportName')}
            className={inputClass}
          />
        </div>
      </div>

      {/* 出生年月日 + 身分證號 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>{t('memberEditBirthDate')}</label>
          <input
            type="text"
            value={draft.birth_date || ''}
            onChange={e => setField('birth_date', e.target.value)}
            onBlur={commit}
            placeholder={t('memberEditPlaceholderBirthDate')}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t('memberEditIdNumber')}</label>
          <input
            type="text"
            value={draft.id_number || ''}
            onChange={e => setField('id_number', e.target.value.toUpperCase())}
            onBlur={commit}
            className={inputClass}
          />
        </div>
      </div>

      {/* 護照號碼 + 護照效期 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>{t('memberEditPassportNumber')}</label>
          <input
            type="text"
            value={draft.passport_number || ''}
            onChange={e => setField('passport_number', e.target.value)}
            onBlur={commit}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t('memberEditPassportExpiry')}</label>
          <input
            type="text"
            value={draft.passport_expiry || ''}
            onChange={e => setField('passport_expiry', e.target.value)}
            onBlur={commit}
            placeholder={t('memberEditPlaceholderPassportExpiry')}
            className={inputClass}
          />
        </div>
      </div>

      {/* 特殊餐食 + 備註 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>{t('memberEditSpecialMeal')}</label>
          <input
            type="text"
            value={draft.special_meal || ''}
            onChange={e => setField('special_meal', e.target.value)}
            onBlur={commit}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t('memberEditRemarks')}</label>
          <input
            type="text"
            value={draft.remarks || ''}
            onChange={e => setField('remarks', e.target.value)}
            onBlur={commit}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  )
}
