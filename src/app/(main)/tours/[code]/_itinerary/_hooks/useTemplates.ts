'use client'

/**
 * 範本 Hook - 提供行程範本資料
 * 目前回傳空陣列
 */

interface Template {
  id: string
  name: string
  description?: string
  preview_image_url?: string | null
}

// 範本顏色映射
const templateColors: Record<string, string> = {
  original: '#8B8680',
  gemini: '#6B7280',
  nature: '#9FA68F',
  luxury: '#C9AA7C',
  art: '#C08374',
  dreamscape: '#A5B4C3',
  collage: '#B5A89A',
  chinese: '#C9AA7C',
  japanese: '#9FA68F',
  none: '#8B8680',
}

export function getTemplateColor(templateId: string): string {
  return templateColors[templateId] || '#8B8680'
}

export function useTemplates() {
  // 預設範本資料
  const defaultTemplates: Template[] = [
    { id: 'original', name: '經典', description: '簡約經典風格' },
    { id: 'nature', name: '自然', description: '清新自然風格' },
    { id: 'luxury', name: '奢華', description: '高端奢華風格' },
    { id: 'art', name: '藝術', description: '藝術創意風格' },
    { id: 'dreamscape', name: '夢幻', description: '夢幻唯美風格' },
    { id: 'collage', name: '拼貼', description: '拼貼混搭風格' },
  ]

  const flightDefaultTemplates: Template[] = [
    { id: 'original', name: '經典', description: '簡約風格' },
    { id: 'chinese', name: '中式', description: '中國風格' },
    { id: 'japanese', name: '日式', description: '日本風格' },
    { id: 'luxury', name: '奢華', description: '高端風格' },
    { id: 'art', name: '藝術', description: '藝術風格' },
    { id: 'dreamscape', name: '夢幻', description: '夢幻風格' },
    { id: 'collage', name: '拼貼', description: '拼貼風格' },
    { id: 'none', name: '無', description: '不顯示' },
  ]

  return {
    templates: defaultTemplates,
    coverTemplates: defaultTemplates,
    dailyTemplates: defaultTemplates,
    flightTemplates: flightDefaultTemplates,
    featuresTemplates: defaultTemplates,
    loading: false,
    isLoading: false,
    error: null,
  }
}
