'use client'

/**
 * 公開行程頁面 - Hero 封面區
 */

interface TourHeroProps {
  heroImage: string | null
  title: string | null
  subtitle: string | null
  code: string
  daysCount: number
  nightsCount: number
}

export function TourHero({ heroImage, title, subtitle, code, daysCount, nightsCount }: TourHeroProps) {
  return (
    <section className="relative h-[31.25rem] md:h-[38.375rem] w-full overflow-hidden flex items-end pb-24 px-8 md:px-24">
      {heroImage ? (
        <img
          src={heroImage}
          alt={title || '行程封面'}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-public-primary via-public-accent to-public-primary" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-public-primary/70 to-transparent"></div>
      <div className="relative z-10 max-w-4xl">
        {daysCount > 0 && (
          <span className="bg-morandi-green text-white px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4 inline-block">
            {daysCount} 天 {nightsCount} 夜
          </span>
        )}
        <h1 className="text-white text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight">
          {title || code}
        </h1>
        {subtitle && (
          <p className="text-white/80 text-lg mt-4 max-w-2xl">{subtitle}</p>
        )}
      </div>
    </section>
  )
}
