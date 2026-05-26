'use client'

/**
 * 公開行程頁面 - 頂部 Header + Sticky 日期導航
 */

import Link from 'next/link'
import { Share2, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DailyItinerary } from './tour-types'

interface TourHeaderProps {
  code: string
  ref?: string | null
  companyName: string
  dailyItinerary: DailyItinerary[]
  activeDay: number
}

export function TourHeader({
  code,
  ref: refParam,
  companyName,
  dailyItinerary,
  activeDay,
}: TourHeaderProps) {
  return (
    <>
      {/* Top Header */}
      <header className="bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <div className="text-xl font-bold tracking-tight text-public-primary">{companyName}</div>
          <nav className="hidden md:flex gap-8 items-center">
            {dailyItinerary.map((_, index) => (
              <a
                key={index}
                href={`#day${index + 1}`}
                className={`text-sm font-medium transition-all ${
                  activeDay === index
                    ? 'text-public-primary font-bold border-b-2 border-public-primary pb-1'
                    : 'text-morandi-secondary hover:text-public-primary'
                }`}
              >
                Day {index + 1}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Share2 className="w-5 h-5 text-morandi-secondary hover:text-public-primary cursor-pointer transition-all" />
            <Heart className="w-5 h-5 text-morandi-secondary hover:text-public-primary cursor-pointer transition-all" />
            <Link href={`/p/tour/${code}/register${refParam ? `?ref=${refParam}` : ''}`}>
              <Button className="bg-gradient-to-r from-public-primary to-public-accent text-white px-6 py-2 rounded-md text-sm hover:opacity-90">
                立即報名
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Sticky Day Navigation */}
      {dailyItinerary.length > 0 && (
        <nav className="sticky top-[4.5rem] z-40 bg-card/60 backdrop-blur-md border-b border-border/20 py-2">
          <div
            className="max-w-7xl mx-auto px-6 flex justify-center md:justify-start gap-2 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {dailyItinerary.map((_, index) => (
              <a
                key={index}
                href={`#day${index + 1}`}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeDay === index
                    ? 'bg-public-primary text-white font-bold'
                    : 'text-morandi-primary hover:bg-morandi-container hover:text-public-primary'
                }`}
              >
                Day {index + 1}
              </a>
            ))}
          </div>
        </nav>
      )}
    </>
  )
}
