'use client'

import React from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  max?: number
  readonly?: boolean
  disabled?: boolean // 別名 for readonly
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function StarRating({
  value,
  onChange,
  max = 5,
  readonly = false,
  disabled = false,
  size = 'md',
  className,
}: StarRatingProps) {
  const isReadonly = readonly || disabled
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1
        const isFilled = starValue <= value

        return (
          <button
            key={starValue}
            type="button"
            disabled={isReadonly}
            onClick={() => !isReadonly && onChange?.(starValue)}
            className={cn(
              'transition-colors',
              !isReadonly && 'hover:text-morandi-gold',
              isReadonly && 'cursor-default'
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                isFilled ? 'fill-morandi-gold text-morandi-gold' : 'text-morandi-muted'
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
