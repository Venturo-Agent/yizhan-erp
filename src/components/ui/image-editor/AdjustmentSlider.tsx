'use client'

/**
 * 調整滑桿子元件
 */

import { Slider } from '@/components/ui/slider'

interface AdjustmentSliderProps {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}

export function AdjustmentSlider({
  label,
  value,
  min = -100,
  max = 100,
  onChange,
}: AdjustmentSliderProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-morandi-secondary">{label}</span>
        <span className="text-xs text-morandi-muted w-10 text-right">
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={values => onChange(values[0])}
        className="w-full"
      />
    </div>
  )
}
