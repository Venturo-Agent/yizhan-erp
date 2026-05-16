'use client'

import React, { useState, useCallback } from 'react'
import { Search, Loader2, ImageIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import { IMAGE_UPLOADER_LABELS } from './constants/labels'

// Unsplash access key 已移至 server-only env var（UNSPLASH_ACCESS_KEY）
// 搜尋改走 /api/unsplash/search 代理、key 不暴露給 browser

interface UnsplashImage {
  id: string
  urls: {
    raw: string
    full: string
    regular: string
    small: string
    thumb: string
  }
  alt_description: string | null
  user: {
    name: string
    links: {
      html: string
    }
  }
  links: {
    download_location: string
  }
}

interface UnsplashSearchProps {
  onSelect: (imageUrl: string) => void
  className?: string
}

export function UnsplashSearch({ onSelect, className }: UnsplashSearchProps) {
  const [query, setQuery] = useState('')
  const [images, setImages] = useState<UnsplashImage[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const searchImages = useCallback(async () => {
    if (!query.trim()) return

    setLoading(true)
    setSearched(true)

    try {
      // 透過 server-side proxy 搜尋（API key 不暴露給 browser）
      const params = new URLSearchParams({
        query: query.trim(),
        per_page: '12',
        orientation: 'landscape',
      })
      const response = await fetch(`/api/unsplash/search?${params}`)

      if (!response.ok) {
        throw new Error('搜尋失敗')
      }

      const data = await response.json()
      setImages(data.results || [])
    } catch (error) {
      logger.error('Unsplash 搜尋失敗:', error)
      setImages([])
    } finally {
      setLoading(false)
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      searchImages()
    }
  }

  const handleSelect = (image: UnsplashImage) => {
    // 使用 regular 尺寸（1080px 寬）作為圖片來源
    const imageUrl = image.urls.regular
    // Unsplash download notification 已移至 server-side，client 直接選取即可
    onSelect(imageUrl)
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* 搜尋框 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size="1em"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-morandi-secondary"
          />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={IMAGE_UPLOADER_LABELS.SEARCH_2570}
            className="pl-9 h-9"
          />
        </div>
        <Button variant="soft-gold"
          onClick={searchImages}
          disabled={!query.trim() || loading}
 className="h-9 px-4"
        >
          {loading ? <Loader2 size="1em" className="animate-spin" /> : '搜尋'}
        </Button>
      </div>

      {/* 搜尋結果 */}
      <div className="min-h-[12.5rem]">
        {loading ? (
          <div className="flex items-center justify-center h-[12.5rem]">
            <Loader2 size="1.5em" className="animate-spin text-morandi-gold" />
          </div>
        ) : images.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 max-h-[18.75rem] overflow-y-auto pr-1">
            {images.map(image => (
              <button
                key={image.id}
                type="button"
                onClick={() => handleSelect(image)}
                className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-transparent hover:border-morandi-gold transition-all group"
              >
                <img
                  src={image.urls.small}
                  alt={image.alt_description || '圖片'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* 攝影師署名 */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[0.625rem] text-white truncate">by {image.user.name}</p>
                </div>
              </button>
            ))}
          </div>
        ) : searched ? (
          <div className="flex flex-col items-center justify-center h-[12.5rem] text-morandi-secondary">
            <ImageIcon size="2em" className="mb-2 opacity-50" />
            <p className="text-sm">{IMAGE_UPLOADER_LABELS.NOT_FOUND_6287}</p>
            <p className="text-xs">{IMAGE_UPLOADER_LABELS.LABEL_1002}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[12.5rem] text-morandi-secondary">
            <ImageIcon size="2em" className="mb-2 opacity-50" />
            <p className="text-sm">{IMAGE_UPLOADER_LABELS.SEARCH_2291}</p>
            <p className="text-xs mt-1">{IMAGE_UPLOADER_LABELS.LABEL_3575}</p>
          </div>
        )}
      </div>

      {/* Unsplash 版權聲明 */}
      <p className="text-[0.625rem] text-morandi-muted text-center">
        Photos provided by{' '}
        <a
          href="https://unsplash.com/?utm_source=venturo&utm_medium=referral"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-morandi-secondary"
        >
          Unsplash
        </a>
      </p>
    </div>
  )
}
