import { Metadata } from 'next'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import PublicViewClient from './client'

interface PageProps {
  params: Promise<{ id: string }>
}

// 動態生成 metadata（Open Graph for LINE/Facebook 預覽）
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params

  try {
    const supabase = getSupabaseAdminClient()
    const { data: itinerary } = await supabase
      .from('itineraries')
      .select('title, tour_code, description, cover_image')
      .eq('id', id)
      .single()

    if (itinerary) {
      // LINE 預覽標題：只顯示團名
      const title = itinerary.title || '行程表'
      const description = itinerary.description || `${itinerary.title || '行程'} - 詳細行程資訊`

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          images: itinerary.cover_image ? [itinerary.cover_image] : [],
          type: 'website',
        },
      }
    }
  } catch (error) {
    logger.error('generateMetadata error:', error)
  }

  return {
    title: '行程表',
    description: '查看詳細行程資訊',
  }
}

/**
 * 公開分享頁面
 * 讓客戶可以不用登入直接查看行程表
 */
export default async function PublicViewPage({ params }: PageProps) {
  const { id } = await params
  return <PublicViewClient id={id} />
}
