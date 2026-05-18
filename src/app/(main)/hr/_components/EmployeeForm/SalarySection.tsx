'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { EmptyValue } from '@/components/ui/empty-value'
import { Money } from '@/components/ui/money'
import { cn } from '@/lib/utils'

const LABELS = {
  HIRE_DATE: '到職日（本公司）',
  TOURISM_JOIN_DATE: '任職日（旅遊業二代）',
  LABOR_INSURANCE_DATE: '加保日（勞保）',
  PAY_DAY: '發薪日',
  PAY_DAY_5: '每月 5 日',
  PAY_DAY_10: '每月 10 日',
  PAY_DAY_15: '每月 15 日',
  PAY_DAY_25: '每月 25 日',
  PAY_DAY_LAST: '每月最後一天',
  BASE_SALARY: '月薪（本薪）',
  BANK_SECTION_TITLE: '匯款帳戶（薪資 / 代墊回收用）',
  BANK_CODE: '銀行代碼',
  BANK_NAME: '銀行名稱',
  BANK_ACCOUNT_NUMBER: '銀行帳號',
  BANK_ACCOUNT_NAME: '戶名',
  ATTENDANCE_BONUS: '全勤獎金（每月固定額）',
  ATTENDANCE_BONUS_NOTE: '2026 新制：請假按比例扣（不再是請一天扣全月）',
  OTHER_ALLOWANCES: '其他津貼合計',
  OTHER_ALLOWANCES_NOTE: '伙食 + 交通 + 職務加給合計（簡化版）',
  INSURED_SALARY: '勞健保投保薪資',
  INSURED_SALARY_PLACEHOLDER: '留空 = 用月薪',
  INSURED_SALARY_NOTE: '勞保 11 級（29,500 - 45,800）/ 健保 58 級',
  PENSION_RATE: '勞退自願提繳率',
  PENSION_RATE_NOTE: '員工自願提繳、上限 6%（雇主固定提 6% 不計於此）',
  SALARY_HISTORY: '調薪紀錄',
  EFFECTIVE_DATE: '生效日期',
  BEFORE: '調整前',
  AFTER: '調整後',
  CHANGE_AMOUNT: '幅度',
  NOTES: '備註',
  NO_SALARY_HISTORY: '尚無調薪紀錄',
} as const

interface SalaryHistoryRecord {
  effective_date: string
  base_salary: number
  reason?: string
}

interface SalarySectionProps {
  formData: {
    hire_date: string
    tourism_join_date: string
    labor_insurance_date: string
    pay_day: number | 'last'
    base_salary: number
    attendance_bonus: number
    other_allowances: number
    insured_salary: number | null
    pension_voluntary_rate: number
    dependents_count: number
    labor_insured_here: boolean
    health_insured_here: boolean
    bank_code: string
    bank_name: string
    bank_account_number: string
    bank_account_name: string
  }
  salaryHistory?: SalaryHistoryRecord[]
  onChange: (patch: Partial<SalarySectionProps['formData']>) => void
}

export function SalarySection({ formData, salaryHistory, onChange }: SalarySectionProps) {
  return (
    <div className="space-y-5 pt-6 mt-6 border-t border-border">
      {/* 基本資訊 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-morandi-primary uppercase">
            {LABELS.HIRE_DATE}
          </Label>
          <DatePicker
            value={formData.hire_date || ''}
            onChange={v => onChange({ hire_date: v })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-morandi-primary uppercase">
            {LABELS.TOURISM_JOIN_DATE}
          </Label>
          <DatePicker
            value={formData.tourism_join_date || ''}
            onChange={v => onChange({ tourism_join_date: v })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-morandi-primary uppercase">
            {LABELS.LABOR_INSURANCE_DATE}
          </Label>
          <DatePicker
            value={formData.labor_insurance_date || ''}
            onChange={v => onChange({ labor_insurance_date: v })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-morandi-primary uppercase">
            {LABELS.PAY_DAY}
          </Label>
          <select
            value={String(formData.pay_day)}
            onChange={e =>
              onChange({
                pay_day: e.target.value === 'last' ? 'last' : Number(e.target.value),
              })
            }
            className="w-full px-3 py-2 border border-morandi-gold/30 rounded-lg focus:border-morandi-gold focus:outline-none bg-card text-morandi-primary"
          >
            <option value="5">{LABELS.PAY_DAY_5}</option>
            <option value="10">{LABELS.PAY_DAY_10}</option>
            <option value="15">{LABELS.PAY_DAY_15}</option>
            <option value="25">{LABELS.PAY_DAY_25}</option>
            <option value="last">{LABELS.PAY_DAY_LAST}</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-morandi-primary uppercase">
            {LABELS.BASE_SALARY}
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-morandi-secondary">NT$</span>
            <Input
              type="number"
              value={formData.base_salary}
              onChange={e => onChange({ base_salary: Number(e.target.value) })}
              className="border-morandi-gold/30 focus:border-morandi-gold"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* 算薪需要的完整薪資組成 */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-morandi-primary uppercase">
            {LABELS.ATTENDANCE_BONUS}
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-morandi-secondary">NT$</span>
            <Input
              type="number"
              value={formData.attendance_bonus}
              onChange={e => onChange({ attendance_bonus: Number(e.target.value) })}
              className="border-morandi-gold/30 focus:border-morandi-gold"
              placeholder="0"
            />
          </div>
          <p className="text-[0.588rem] text-morandi-muted">
            {LABELS.ATTENDANCE_BONUS_NOTE}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-morandi-primary uppercase">
            {LABELS.OTHER_ALLOWANCES}
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-morandi-secondary">NT$</span>
            <Input
              type="number"
              value={formData.other_allowances}
              onChange={e => onChange({ other_allowances: Number(e.target.value) })}
              className="border-morandi-gold/30 focus:border-morandi-gold"
              placeholder="0"
            />
          </div>
          <p className="text-[0.588rem] text-morandi-muted">
            {LABELS.OTHER_ALLOWANCES_NOTE}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-morandi-primary uppercase">
            {LABELS.INSURED_SALARY}
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-morandi-secondary">NT$</span>
            <Input
              type="number"
              value={formData.insured_salary ?? ''}
              onChange={e =>
                onChange({
                  insured_salary: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              className="border-morandi-gold/30 focus:border-morandi-gold"
              placeholder={LABELS.INSURED_SALARY_PLACEHOLDER}
            />
          </div>
          <p className="text-[0.588rem] text-morandi-muted">
            {LABELS.INSURED_SALARY_NOTE}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-morandi-primary uppercase">
            {LABELS.PENSION_RATE}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="0.06"
              value={formData.pension_voluntary_rate}
              onChange={e => {
                const v = Number(e.target.value)
                onChange({
                  pension_voluntary_rate: Math.min(Math.max(v, 0), 0.06),
                })
              }}
              className="border-morandi-gold/30 focus:border-morandi-gold"
              placeholder="0"
            />
            <span className="text-morandi-secondary">
              ({(formData.pension_voluntary_rate * 100).toFixed(1)}%)
            </span>
          </div>
          <p className="text-[0.588rem] text-morandi-muted">
            {LABELS.PENSION_RATE_NOTE}
          </p>
        </div>
      </div>

      {/* 勞健保投保設定（2026-05-15 William 拍板加） */}
      <div className="pt-4 border-t border-border">
        <h4 className="text-sm font-semibold text-morandi-primary mb-3">
          勞健保投保設定
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {/* 健保眷屬數 */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-morandi-primary uppercase">
              健保眷屬人數
            </Label>
            <Input
              type="number"
              min="0"
              max="20"
              value={formData.dependents_count}
              onChange={e =>
                onChange({
                  dependents_count: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
            <p className="text-[0.588rem] text-morandi-muted">
              眷屬數影響健保保費（員工負擔 = 投保金額 × 1.551% × (1 + 眷屬)）
            </p>
          </div>
          <div className="space-y-2 col-span-2">
            {/* 勞保是否在本公司 */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.labor_insured_here}
                onChange={e => onChange({ labor_insured_here: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-morandi-primary">
                勞保在本公司投保
              </span>
              <span className="text-xs text-morandi-muted">
                （未勾選 = 員工在他處投保、譬如公會 / 兼職）
              </span>
            </label>
            {/* 健保是否在本公司 */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.health_insured_here}
                onChange={e => onChange({ health_insured_here: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-morandi-primary">
                健保在本公司投保
              </span>
              <span className="text-xs text-morandi-muted">
                （未勾選 = 員工健保在他處）
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* 銀行帳戶（薪資匯款 / 代墊回收用、2026-05-15 加） */}
      <div className="pt-4 border-t border-border">
        <h4 className="text-sm font-semibold text-morandi-primary mb-3">
          {LABELS.BANK_SECTION_TITLE}
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-morandi-primary uppercase">
              {LABELS.BANK_CODE}
            </Label>
            <Input
              value={formData.bank_code}
              onChange={e => onChange({ bank_code: e.target.value })}
              placeholder="例：808"
              className="border-morandi-gold/30 focus:border-morandi-gold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-morandi-primary uppercase">
              {LABELS.BANK_NAME}
            </Label>
            <Input
              value={formData.bank_name}
              onChange={e => onChange({ bank_name: e.target.value })}
              placeholder="例：玉山銀行"
              className="border-morandi-gold/30 focus:border-morandi-gold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-morandi-primary uppercase">
              {LABELS.BANK_ACCOUNT_NUMBER}
            </Label>
            <Input
              value={formData.bank_account_number}
              onChange={e => onChange({ bank_account_number: e.target.value })}
              placeholder="銀行帳號"
              className="border-morandi-gold/30 focus:border-morandi-gold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-morandi-primary uppercase">
              {LABELS.BANK_ACCOUNT_NAME}
            </Label>
            <Input
              value={formData.bank_account_name}
              onChange={e => onChange({ bank_account_name: e.target.value })}
              placeholder="戶名"
              className="border-morandi-gold/30 focus:border-morandi-gold"
            />
          </div>
        </div>
      </div>

      {/* 調薪紀錄 */}
      <div className="pt-4 border-t border-border">
        <h4 className="text-sm font-semibold text-morandi-primary mb-3">{LABELS.SALARY_HISTORY}</h4>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-morandi-container/50">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-morandi-secondary text-xs uppercase">
                  {LABELS.EFFECTIVE_DATE}
                </th>
                <th className="px-4 py-2.5 text-right font-semibold text-morandi-secondary text-xs uppercase">
                  {LABELS.BEFORE}
                </th>
                <th className="px-4 py-2.5 text-right font-semibold text-morandi-secondary text-xs uppercase">
                  {LABELS.AFTER}
                </th>
                <th className="px-4 py-2.5 text-right font-semibold text-morandi-secondary text-xs uppercase">
                  {LABELS.CHANGE_AMOUNT}
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-morandi-secondary text-xs uppercase">
                  {LABELS.NOTES}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {salaryHistory && salaryHistory.length > 0 ? (
                salaryHistory.map((record, idx, arr) => {
                  const prevSalary =
                    idx < arr.length - 1 ? arr[idx + 1].base_salary : null
                  return (
                    <tr key={idx} className="hover:bg-morandi-container/30">
                      <td className="px-4 py-3 text-morandi-primary">
                        {record.effective_date}
                      </td>
                      <td className="px-4 py-3 text-right text-morandi-secondary">
                        {prevSalary ? <Money amount={prevSalary} /> : <EmptyValue />}
                      </td>
                      <td className="px-4 py-3 text-right text-morandi-primary font-medium">
                        <Money amount={record.base_salary} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {prevSalary && (
                          <span
                            className={cn(
                              'text-xs',
                              record.base_salary > prevSalary
                                ? 'text-morandi-green'
                                : 'text-morandi-red'
                            )}
                          >
                            {record.base_salary > prevSalary ? '+' : ''}
                            {(
                              ((record.base_salary - prevSalary) / prevSalary) *
                              100
                            ).toFixed(1)}
                            %
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-morandi-secondary text-xs">
                        {record.reason || <EmptyValue />}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-morandi-secondary"
                  >
                    {LABELS.NO_SALARY_HISTORY}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
