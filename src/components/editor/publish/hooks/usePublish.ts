'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores'
import { useToursSlim, createItinerary, updateItinerary } from '@/data'
import type { TourFormData } from '@/components/editor/tour-form/types'
import type { ItineraryVersionRecord } from '@/stores/types'
import { generateUUID } from '@/lib/utils/uuid'
import { logger } from '@/lib/utils/logger'
import { alert } from '@/lib/ui/alert-dialog'
import { stripHtml } from '@/lib/utils/string-utils'
import { TOUR_STATUS } from '@/lib/constants/status-maps'
import type { TourStatus } from '@/types/tour.types'

interface PublishButtonData extends Partial<TourFormData> {
  id?: string
  status?: string
  tourId?: string
  meetingInfo?: unknown
  version_records?: ItineraryVersionRecord[]
}

interface UsePublishProps {
  data: PublishButtonData
  currentVersionIndex: number
  onVersionChange: (index: number, versionData?: ItineraryVersionRecord) => void
  onVersionRecordsChange?: (versionRecords: ItineraryVersionRecord[]) => void
  // 嵌入在 tour 分頁等非獨立路由時，提供此 callback 取代預設的 router.replace
  onCreated?: (newItineraryId: string) => void
}

export function usePublish({
  data,
  currentVersionIndex,
  onVersionChange,
  onVersionRecordsChange,
  onCreated,
}: UsePublishProps) {
  const [saving, setSaving] = useState(false)
  const [versionNote, setVersionNote] = useState('')
  const [newFileName, setNewFileName] = useState('')
  const [copied, setCopied] = useState(false)
  const { user } = useAuthStore()
  const { items: tours } = useToursSlim()
  const router = useRouter()

  const versionRecords = data.version_records || []
  const isEditMode = !!data.id

  // 取得關聯團的團號（優先使用）
  const linkedTourCode = useMemo(() => {
    if (!data.tourId) return null
    const linkedTour = tours.find(t => t.id === data.tourId)
    return linkedTour?.code || null
  }, [data.tourId, tours])

  // 分享連結：優先使用關聯團的團號，其次用行程表的 tour_code，最後用 ID
  const shareUrl = useMemo(() => {
    if (!data.id) return null
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const tourCode = linkedTourCode || data.tourCode
    return tourCode ? `${baseUrl}/view/${tourCode}` : `${baseUrl}/view/${data.id}`
  }, [data.id, data.tourCode, linkedTourCode])

  // 轉換資料格式（camelCase → snake_case）
  const convertData = () => ({
    tour_id: data.tourId || undefined,
    tagline: data.tagline,
    title: data.title,
    subtitle: data.subtitle,
    description: data.description,
    departure_date: data.departureDate,
    tour_code: data.tourCode,
    cover_image: data.coverImage,
    cover_style: data.coverStyle || 'original',
    flight_style: data.flightStyle || 'original',
    itinerary_style: data.itineraryStyle || 'original',
    price_note: data.priceNote || null,
    // SSOT：country/city 屬於 tours.country_id / airport_code，itineraries 不再保存副本。
    // 顯示時請從 tour 直接讀。寫空字串而非 null 是為了相容 schema 型別。
    country: '',
    city: '',
    // 5/13 v2：itineraries.status 改英文 enum、對齊整體紀律
    status: (data.status === 'published' ? 'published' : 'draft') as 'draft' | 'published',
    outbound_flight: data.outboundFlight,
    return_flight: data.returnFlight,
    features: data.features,
    focus_cards: data.focusCards,
    leader: data.leader,
    meeting_info: data.meetingInfo as { time: string; location: string } | undefined,
    hotels: data.hotels,
    show_features: data.showFeatures,
    show_leader_meeting: data.showLeaderMeeting,
    show_hotels: data.showHotels,
    show_pricing_details: data.showPricingDetails,
    show_price_tiers: data.showPriceTiers || false,
    price_tiers: data.priceTiers || null,
    faqs: data.faqs || null,
    show_faqs: data.showFaqs || false,
    notices: data.notices || null,
    show_notices: data.showNotices || false,
    cancellation_policy: data.cancellationPolicy || null,
    show_cancellation_policy: data.showCancellationPolicy || false,
    itinerary_subtitle: data.itinerarySubtitle,
    daily_itinerary: data.dailyItinerary,
  })

  // 儲存（覆蓋目前版本）
  const saveItinerary = async () => {
    setSaving(true)
    try {
      const convertedData = convertData()

      if (data.id) {
        if (currentVersionIndex === -1) {
          // 更新主版本（同時更新版本 1 的資料）
          let updatedRecords = [...versionRecords]
          if (updatedRecords.length > 0) {
            updatedRecords[0] = {
              ...updatedRecords[0],
              note: stripHtml(data.title) || updatedRecords[0].note,
              daily_itinerary: data.dailyItinerary || [],
              features: data.features,
              focus_cards: data.focusCards,
              leader: data.leader,
              meeting_info: data.meetingInfo as { time: string; location: string } | undefined,
              hotels: data.hotels,
            }
          } else {
            const firstVersion: ItineraryVersionRecord = {
              id: generateUUID(),
              version: 1,
              note: stripHtml(data.title) || '版本 1',
              daily_itinerary: data.dailyItinerary || [],
              features: data.features,
              focus_cards: data.focusCards,
              leader: data.leader,
              meeting_info: data.meetingInfo as { time: string; location: string } | undefined,
              hotels: data.hotels,
              created_at: new Date().toISOString(),
            }
            updatedRecords = [firstVersion]
          }
          await updateItinerary(data.id, { ...convertedData, version_records: updatedRecords })
          onVersionRecordsChange?.(updatedRecords)
        } else {
          const updatedRecords = [...versionRecords]
          updatedRecords[currentVersionIndex] = {
            ...updatedRecords[currentVersionIndex],
            daily_itinerary: data.dailyItinerary || [],
            features: data.features,
            focus_cards: data.focusCards,
            leader: data.leader,
            meeting_info: data.meetingInfo as { time: string; location: string } | undefined,
            hotels: data.hotels,
          }
          await updateItinerary(data.id, { version_records: updatedRecords })
          onVersionRecordsChange?.(updatedRecords)
        }

        // 報價單直接讀核心表，不需要同步
      } else {
        const firstVersion: ItineraryVersionRecord = {
          id: generateUUID(),
          version: 1,
          note: stripHtml(data.title) || '版本 1',
          daily_itinerary: data.dailyItinerary || [],
          features: data.features,
          focus_cards: data.focusCards,
          leader: data.leader,
          meeting_info: data.meetingInfo as { time: string; location: string } | undefined,
          hotels: data.hotels,
          created_at: new Date().toISOString(),
        }

        const newItinerary = await createItinerary({
          ...convertedData,
          created_by: user?.id || undefined,
          version_records: [firstVersion],
        } as Parameters<typeof createItinerary>[0])

        if (newItinerary?.id) {
          if (onCreated) {
            onCreated(newItinerary.id)
          } else {
            router.replace(`/itinerary/new?itinerary_id=${newItinerary.id}`)
          }
        }
      }
    } catch (error) {
      logger.error('儲存失敗:', error)
      await alert('儲存失敗：' + (error instanceof Error ? error.message : '未知錯誤'), 'error')
    } finally {
      setSaving(false)
    }
  }

  // 另存新版本
  const saveAsNewVersion = async () => {
    if (!data.id) {
      await alert('請先儲存行程表才能另存新版本', 'warning')
      return
    }

    setSaving(true)
    try {
      const newVersion: ItineraryVersionRecord = {
        id: generateUUID(),
        version: versionRecords.length + 1,
        note: versionNote || stripHtml(data.title) || `版本 ${versionRecords.length + 1}`,
        daily_itinerary: data.dailyItinerary || [],
        features: data.features,
        focus_cards: data.focusCards,
        leader: data.leader,
        meeting_info: data.meetingInfo as { time: string; location: string } | undefined,
        hotels: data.hotels,
        created_at: new Date().toISOString(),
      }

      const updatedRecords = [...versionRecords, newVersion]
      await updateItinerary(data.id, { version_records: updatedRecords })
      onVersionRecordsChange?.(updatedRecords)

      // 報價單直接讀核心表，不需要同步

      setVersionNote('')
      onVersionChange(updatedRecords.length - 1, newVersion)
    } catch (error) {
      logger.error('另存新版本失敗:', error)
      await alert(
        '另存新版本失敗：' + (error instanceof Error ? error.message : '未知錯誤'),
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  // 另存新檔
  const saveAsNewFile = async () => {
    setSaving(true)
    try {
      const convertedData = convertData()

      const newItinerary = await createItinerary({
        ...convertedData,
        title: newFileName || `${stripHtml(data.title) || '行程表'} (複本)`,
        created_by: user?.id || undefined,
        version_records: [],
      } as Parameters<typeof createItinerary>[0])

      if (newItinerary?.id) {
        setNewFileName('')
        window.location.href = `/itinerary/new?itinerary_id=${newItinerary.id}`
      }
    } catch (error) {
      logger.error('另存新檔失敗:', error)
      await alert('另存新檔失敗：' + (error instanceof Error ? error.message : '未知錯誤'), 'error')
    } finally {
      setSaving(false)
    }
  }

  // 複製連結
  const copyShareLink = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // 取得目前版本名稱
  const getCurrentVersionName = () => {
    if (currentVersionIndex === -1) {
      const firstVersion = versionRecords[0]
      return stripHtml(firstVersion?.note) || stripHtml(data.title) || '版本 1'
    }
    const record = versionRecords[currentVersionIndex]
    return stripHtml(record?.note) || `版本 ${record?.version || currentVersionIndex + 1}`
  }

  return {
    saving,
    versionNote,
    setVersionNote,
    newFileName,
    setNewFileName,
    copied,
    versionRecords,
    isEditMode,
    shareUrl,
    saveItinerary,
    saveAsNewVersion,
    saveAsNewFile,
    copyShareLink,
    getCurrentVersionName,
    stripHtml,
  }
}
