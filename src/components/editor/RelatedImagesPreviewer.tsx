'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ImageIcon, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import { COMP_EDITOR_LABELS } from './constants/labels'

interface RelatedImage {
  id: string
  name: string
  public_url: string
  tags: string[]
}

interface RelatedImagesPreviewerProps {
  activityTitle: string
  currentImageUrl?: string
  onSelectImage: (imageUrl: string) => void
  className?: string
}

export function RelatedImagesPreviewer({
  activityTitle,
  currentImageUrl,
  onSelectImage,
  className = '',
}: RelatedImagesPreviewerProps) {
  const [relatedImages, setRelatedImages] = useState<RelatedImage[]>([])
  const [loading, setLoading] = useState(false)
  const workspaceId = useAuthStore(state => state.user?.workspace_id)

  // 載入相關圖片 - 監聽標題、workspace 和當前圖片變化
  useEffect(() => {
    if (activityTitle && workspaceId && activityTitle.length > 0) {
      loadRelatedImages()
    } else {
      setRelatedImages([])
    }
  }, [activityTitle, workspaceId, currentImageUrl]) // 添加 currentImageUrl 依賴

  const loadRelatedImages = async () => {
    try {
      setLoading(true)

      // 搜尋包含景點名稱關鍵字的圖片 - 改進搜尋邏輯
      const keywords = activityTitle.split(/[・\s&]+/).filter(k => k.length > 0)

      if (keywords.length === 0) {
        setRelatedImages([])
        return
      }

      // 先檢查表格是否存在
      const { error: checkError } = await supabase.from('image_library').select('id').limit(1)

      if (checkError) {
        logger.error(COMP_EDITOR_LABELS.圖庫表格不存在, checkError)
        setRelatedImages([])
        return
      }

      // 改進搜尋策略：搜尋所有關鍵字，用 OR 邏輯組合
      let queryBuilder = supabase
        .from('image_library')
        .select('id, name, public_url, tags')
        .eq('workspace_id', workspaceId ?? '')
        .eq('category', 'activity')

      // 搜尋策略：精確匹配景點名稱，或包含關鍵字的圖片
      // 首先嘗試精確匹配
      queryBuilder = queryBuilder.eq('name', activityTitle)

      const { data, error } = await queryBuilder.order('created_at', { ascending: false }).limit(6)

      if (error) {
        logger.error(COMP_EDITOR_LABELS.載入相關圖片失敗, error)

        // 如果 OR 查詢失敗，回退到簡單搜尋
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('image_library')
          .select('id, name, public_url, tags')
          .eq('workspace_id', workspaceId ?? '')
          .eq('category', 'activity')
          .ilike('name', `%${keywords[0]}%`)
          .order('created_at', { ascending: false })
          .limit(6)

        if (fallbackError) {
          logger.error(COMP_EDITOR_LABELS.回退搜尋也失敗, fallbackError)
          setRelatedImages([])
          return
        }

        // 使用回退搜尋結果
        const filteredImages = (fallbackData || [])
          .filter(img => img.public_url !== currentImageUrl)
          .map(img => ({ ...img, tags: img.tags ?? [] }))
        setRelatedImages(filteredImages)
        return
      }

      // 排除當前使用的圖片
      const filteredImages = (data || [])
        .filter(img => img.public_url !== currentImageUrl)
        .map(img => ({ ...img, tags: img.tags ?? [] }))

      setRelatedImages(filteredImages)
    } catch (error) {
      logger.error(COMP_EDITOR_LABELS.載入相關圖片錯誤, error)
      setRelatedImages([])
    } finally {
      setLoading(false)
    }
  }

  // 手動重新載入
  const handleRefresh = () => {
    if (activityTitle && workspaceId) {
      loadRelatedImages()
    }
  }

  if (relatedImages.length === 0 && !loading) {
    return null
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center w-6 h-6 border border-dashed border-morandi-container rounded">
            <ImageIcon size="0.625em" className="text-morandi-secondary opacity-50" />
          </div>
        ) : relatedImages.length > 0 ? (
          <>
            {relatedImages.map(image => (
              <motion.div
                key={image.id}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onSelectImage(image.public_url)}
                className="relative w-6 h-6 flex-shrink-0 rounded border border-morandi-container hover:border-morandi-gold cursor-pointer overflow-hidden group transition-all"
                title={image.name}
              >
                <Image
                  src={image.public_url}
                  alt={image.name}
                  fill
                  className="object-cover"
                  sizes="24px"
                />
                {/* 懸停遮罩 */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                {/* 選擇指示 */}
                <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-2 h-2 bg-morandi-gold rounded-full flex items-center justify-center">
                    <span className="text-white text-[0.375rem]">✓</span>
                  </div>
                </div>
              </motion.div>
            ))}
            {/* 重新載入按鈕 */}
            <button
              onClick={handleRefresh}
              className="w-6 h-6 flex-shrink-0 rounded border border-morandi-container hover:border-morandi-gold bg-morandi-background-cream hover:bg-morandi-gold/10 flex items-center justify-center transition-all"
              title={COMP_EDITOR_LABELS.重新載入相關圖片}
            >
              <RefreshCw size="0.625em" className="text-morandi-secondary" />
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
