'use client'

/**
 * SetupWizard StepIndicator — 通用 setup 嚮導進度條
 *
 * 用途：LINE / FB / IG / 其他通路 setup 都用同一個視覺、避免每個 channel
 * 各自畫一遍 step 進度條。原始版本內嵌在 /bot/setup/page.tsx、抽出來給三通路共用。
 *
 * 用法：
 *   const steps = [
 *     { key: 'welcome', label: '介紹' },
 *     { key: 'credentials', label: '填資料' },
 *     ...
 *   ] as const
 *   <StepIndicator steps={steps} current={step} />
 */

import React from 'react'
import { Check } from 'lucide-react'

export interface SetupStep<TKey extends string = string> {
  key: TKey
  label: string
}

export function StepIndicator<TKey extends string>({
  steps,
  current,
}: {
  steps: ReadonlyArray<SetupStep<TKey>>
  current: TKey
}) {
  const currentIdx = steps.findIndex(s => s.key === current)

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const isActive = i === currentIdx
        const isPast = i < currentIdx
        return (
          <React.Fragment key={s.key}>
            <div
              className={`flex items-center gap-2 ${
                isActive
                  ? 'text-morandi-gold font-semibold'
                  : isPast
                    ? 'text-green-600'
                    : 'text-morandi-muted'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${
                  isActive
                    ? 'border-morandi-gold bg-morandi-gold/10'
                    : isPast
                      ? 'border-green-600 bg-green-600 text-white'
                      : 'border-morandi-muted/40'
                }`}
              >
                {isPast ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className="text-sm hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-morandi-muted/20" />}
          </React.Fragment>
        )
      })}
    </div>
  )
}
