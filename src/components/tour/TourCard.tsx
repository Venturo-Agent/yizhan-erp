'use client'

import type { CardComponentProps } from 'nextstepjs'

/**
 * 導覽氣泡卡片（莫蘭迪設計）
 *
 * 走公司 design token（morandi-* / status-*），不用 Tailwind 預設色（UI 紀律紅線）。
 * NextStepjs 把這個 component 當氣泡內容渲染，傳入 step / 進度 / 上下步控制。
 * 箭頭由 NextStep 的 displayArrow={false} 關掉（spotlight 已框出範圍、不需箭頭）。
 */
export function TourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
}: CardComponentProps) {
  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1
  // 最後一步（個人區）貼螢幕底：搭 userStep 的 side='right-top'，把卡片往上推、
  // 讓底緣對齊錨點底緣（3.5rem = 個人區 h-14），做出「右側、往上長」不被切。
  const bottomAnchoredStyle = isLast ? { transform: 'translateY(calc(-100% + 3.5rem))' } : undefined

  return (
    <div
      className="w-80 max-w-[90vw] rounded-xl border border-morandi-gold/20 bg-morandi-cream p-5 shadow-lg"
      style={bottomAnchoredStyle}
    >
      {/* 標題 + 進度 */}
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-morandi-primary">{step.title}</h3>
        <span className="shrink-0 text-xs text-morandi-muted">
          {currentStep + 1} / {totalSteps}
        </span>
      </div>

      {/* 內容 */}
      <div className="mb-5 text-sm leading-relaxed text-morandi-secondary">{step.content}</div>

      {/* 控制列 */}
      <div className="flex items-center justify-between gap-2">
        {step.showSkip && !isLast ? (
          <button
            type="button"
            onClick={skipTour}
            className="text-xs text-morandi-muted transition-colors hover:text-morandi-primary"
          >
            略過
          </button>
        ) : (
          <span />
        )}

        <div className="flex gap-2">
          {!isFirst && (
            <button
              type="button"
              onClick={prevStep}
              className="rounded-lg border border-morandi-gold/30 px-4 py-1.5 text-sm text-morandi-primary transition-colors hover:bg-morandi-gold/5"
            >
              上一步
            </button>
          )}
          <button
            type="button"
            onClick={nextStep}
            className="rounded-lg bg-morandi-gold px-4 py-1.5 text-sm text-morandi-cream transition-colors hover:bg-morandi-gold-hover"
          >
            {isLast ? '完成' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  )
}
