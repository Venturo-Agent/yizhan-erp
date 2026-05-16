'use client'

type CoverStyleType = 'original' | 'gemini' | 'nature' | 'luxury' | 'art' | 'dreamscape' | 'collage'

interface SectionTitleProps {
  title: string
  subtitle?: string
  coverStyle?: CoverStyleType
  className?: string
}

/**
 * 區塊標題組件 - 根據 coverStyle 切換風格
 * - original/gemini: 原版金色標題
 * - nature: 中國風書法標題
 */
export function SectionTitle({
  title,
  subtitle,
  coverStyle = 'original',
  className = '',
}: SectionTitleProps) {
  const isChineseStyle = coverStyle === 'nature'

  // 中國風版本（nature）
  if (isChineseStyle) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 mb-8 text-center ${className}`}
      >
        <h2 className="text-morandi-primary text-2xl md:text-3xl font-serif font-medium tracking-wide">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-morandi-secondary tracking-widest font-serif">{subtitle}</p>
        )}
      </div>
    )
  }

  // 原版風格（original/gemini）
  return (
    <div className={`text-center mb-8 ${className}`}>
      <h2 className="text-2xl sm:text-3xl font-bold text-morandi-primary mb-2">{title}</h2>
      {subtitle && <p className="text-morandi-secondary text-sm sm:text-base">{subtitle}</p>}
    </div>
  )
}
