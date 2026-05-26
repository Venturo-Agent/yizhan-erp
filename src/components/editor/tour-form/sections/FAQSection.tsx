'use client'

import React from 'react'
import { TourFormData, FAQ } from '../types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, HelpCircle, GripVertical, MessageCircleQuestion } from 'lucide-react'
import { COMP_EDITOR_LABELS } from '../../constants/labels'

interface FAQSectionProps {
  data: TourFormData
  onChange: (data: TourFormData) => void
}

// 預設常見問題
const getDefaultFAQs = (): FAQ[] => [
  {
    question: COMP_EDITOR_LABELS.行程可以客製化嗎,
    answer:
      COMP_EDITOR_LABELS.可以的_我們提供彈性的行程調整服務_可依您的需求增減景點_調整住宿等級或延長天數_歡迎與我們聯繫討論,
  },
  {
    question: COMP_EDITOR_LABELS.需要準備什麼證件,
    answer:
      COMP_EDITOR_LABELS.請準備有效期限超過六個月的護照_部分國家可能需要簽證_我們會在行前說明會提供詳細資訊,
  },
  {
    question: COMP_EDITOR_LABELS.團費包含小費嗎,
    answer:
      COMP_EDITOR_LABELS.團費不含導遊_司機小費_建議每人每日小費約_NT_200_300_實際金額可依服務品質自行調整,
  },
  {
    question: COMP_EDITOR_LABELS.可以刷卡付款嗎,
    answer:
      COMP_EDITOR_LABELS.可以_我們接受信用卡付款_VISA_MasterCard_JCB_也可選擇銀行轉帳或現金付款,
  },
]

export function FAQSection({ data, onChange }: FAQSectionProps) {
  const faqs = data.faqs || getDefaultFAQs()

  // 更新常見問題
  const updateFAQ = (index: number, updates: Partial<FAQ>) => {
    const newFAQs = [...faqs]
    newFAQs[index] = { ...newFAQs[index], ...updates }
    onChange({ ...data, faqs: newFAQs })
  }

  // 新增常見問題
  const addFAQ = () => {
    const newFAQs = [
      ...faqs,
      {
        question: '',
        answer: '',
      },
    ]
    onChange({ ...data, faqs: newFAQs })
  }

  // 刪除常見問題
  const removeFAQ = (index: number) => {
    if (faqs.length <= 1) return
    const newFAQs = faqs.filter((_, i) => i !== index)
    onChange({ ...data, faqs: newFAQs })
  }

  return (
    <div className="space-y-6">
      {/* 區塊標題 */}
      <h2 className="text-lg font-bold text-morandi-primary border-b-2 border-morandi-gold pb-1">
        {COMP_EDITOR_LABELS.常見問題}
      </h2>

      {/* 顯示開關 */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
        <div className="flex items-center gap-3">
          <MessageCircleQuestion className="h-5 w-5 text-morandi-primary" />
          <div>
            <h3 className="font-medium text-morandi-primary">{COMP_EDITOR_LABELS.LABEL_4954}</h3>
            <p className="text-sm text-morandi-secondary">{COMP_EDITOR_LABELS.LABEL_7714}</p>
          </div>
        </div>
        <Switch
          checked={data.showFaqs || false}
          onCheckedChange={checked => {
            onChange({
              ...data,
              showFaqs: checked,
              faqs: checked && !data.faqs ? getDefaultFAQs() : data.faqs,
            })
          }}
        />
      </div>

      {/* 主內容區域 */}
      {data.showFaqs && (
        <div className="space-y-4">
          {/* FAQ 列表 */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="p-4 border border-morandi-container rounded-lg bg-card space-y-3"
              >
                {/* 標題列 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-morandi-muted" />
                    <HelpCircle className="h-4 w-4 text-morandi-gold" />
                    <span className="text-sm font-medium text-morandi-secondary">
                      問題 {index + 1}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFAQ(index)}
                    disabled={faqs.length <= 1}
                    className="h-7 w-7 p-0 text-morandi-muted hover:text-status-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* 問題 */}
                <div>
                  <Label className="text-xs text-morandi-primary">
                    {COMP_EDITOR_LABELS.LABEL_5266}
                  </Label>
                  <Input
                    value={faq.question}
                    onChange={e => updateFAQ(index, { question: e.target.value })}
                    placeholder={COMP_EDITOR_LABELS.輸入常見問題_如_行程可以客製化嗎}
                    className="mt-1"
                  />
                </div>

                {/* 答案 */}
                <div>
                  <Label className="text-xs text-morandi-primary">
                    {COMP_EDITOR_LABELS.LABEL_1877}
                  </Label>
                  <Textarea
                    value={faq.answer}
                    onChange={e => updateFAQ(index, { answer: e.target.value })}
                    placeholder={COMP_EDITOR_LABELS.輸入問題的答案}
                    className="mt-1 min-h-[5rem] resize-none"
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 新增按鈕 */}
          <Button
            type="button"
            variant="soft-gold"
            onClick={addFAQ}
            className="w-full border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            {COMP_EDITOR_LABELS.ADD_8197}
          </Button>

          {/* 預覽提示 */}
          <div className="p-3 bg-status-info-bg border border-morandi-gold rounded-lg">
            <p className="text-sm text-status-info">
              💡 常見問題會以 Q&A 格式顯示在行程頁面底部，建議設定 3-5 個常見問題。
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
