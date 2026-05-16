/**
 * usePackageItinerary actions
 * 把 handleSubmit / handleSaveAsNewVersion 的 async DB 邏輯抽出來
 * 接收所有需要的 state 和 callback、回傳結果讓 hook 自己做 setState
 */

import { supabase } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/types'
import type { Itinerary, ItineraryVersionRecord } from '@/stores/types'
import { logger } from '@/lib/utils/logger'
import { alert } from '@/lib/ui/alert-dialog'
import { formatDailyItinerary } from './format-itinerary'
import { buildFlightPayload } from './usePackageItinerary.helpers'
import type { DailyScheduleItem, ItineraryFormData, ItineraryEditorContext } from './types'

// ============================================
// 型別
// ============================================

/** submitItinerary 回傳值 */
export type SubmitResult =
  | { ok: true; newItineraryId?: string; refreshedItinerary?: Itinerary }
  | { ok: false; errorMessage: string }

/** saveAsNewVersion 回傳值 */
export type SaveVersionResult =
  | { ok: true; updatedRecords: ItineraryVersionRecord[]; newVersionIndex: number }
  | { ok: false }

// ============================================
// 提交行程表（建立 or 更新）
// ============================================

interface SubmitParams {
  dailySchedule: DailyScheduleItem[]
  ctx: ItineraryEditorContext
  formData: ItineraryFormData
  isEditMode: boolean
  existingItinerary: Itinerary | undefined
  currentUser: { display_name?: string; chinese_name?: string; workspace_id?: string } | null
  getPreviousAccommodation: (index: number) => string
  create: (data: Omit<Itinerary, 'id' | 'created_at' | 'updated_at'>) => Promise<Itinerary | null>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  syncToCore: (params: { itinerary_id: string; tour_id: string | null; daily_itinerary: any }) => Promise<any>
  onItineraryCreated?: (id?: string) => void
  onClose: () => void
}

const ITINERARY_SELECT_FIELDS =
  'id, tour_id, title, subtitle, tour_code, cover_image, country, city, departure_date, duration_days, meeting_info, leader, outbound_flight, return_flight, daily_itinerary, version_records, workspace_id, created_at, updated_at'

export async function submitItinerary(params: SubmitParams): Promise<SubmitResult> {
  const {
    dailySchedule,
    ctx,
    formData,
    isEditMode,
    existingItinerary,
    currentUser,
    getPreviousAccommodation,
    create,
    syncToCore,
    onItineraryCreated,
    onClose,
  } = params

  try {
    const formattedDailyItinerary = formatDailyItinerary({
      dailySchedule,
      startDate: ctx.start_date || null,
      getPreviousAccommodation,
    })

    const authorName = currentUser?.display_name || currentUser?.chinese_name || ''

    if (isEditMode && existingItinerary) {
      logger.log('更新行程表資料:', { id: existingItinerary.id, title: formData.title })

      const { error: updateError } = await supabase
        .from('itineraries')
        .update({
          title: formData.title,
          daily_itinerary: formattedDailyItinerary,
          country: ctx.country_id || '',
          city: ctx.airport_code || '',
          outbound_flight: formData.outboundFlight
            ? (buildFlightPayload(formData.outboundFlight) as unknown as Json)
            : null,
          return_flight: formData.returnFlight
            ? (buildFlightPayload(formData.returnFlight) as unknown as Json)
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingItinerary.id)

      if (updateError) throw new Error(updateError.message)

      logger.log('行程表更新成功')

      syncToCore({
        itinerary_id: existingItinerary.id,
        tour_id: null,
        daily_itinerary: formattedDailyItinerary,
      }).catch(err => logger.warn('核心表同步失敗（不影響儲存）:', err))

      const { data: refreshedData } = await supabase
        .from('itineraries')
        .select(ITINERARY_SELECT_FIELDS)
        .eq('id', existingItinerary.id)
        .single()

      onItineraryCreated?.(existingItinerary.id)
      return {
        ok: true,
        newItineraryId: existingItinerary.id,
        refreshedItinerary: refreshedData ? (refreshedData as unknown as Itinerary) : undefined,
      }
    } else {
      const workspaceId = currentUser?.workspace_id
      if (!workspaceId) throw new Error('無法取得 workspace_id，請重新登入')

      const createData = {
        title: formData.title,
        tour_id: null,
        tour_code: '',
        status: '開團',
        author_name: authorName,
        departure_date: ctx.start_date || '',
        country: ctx.country_id || '',
        city: ctx.airport_code || '',
        daily_itinerary: formattedDailyItinerary,
        description: formData.description,
        cover_image: '',
        features: [],
        focus_cards: [],
        workspace_id: workspaceId,
        outbound_flight: formData.outboundFlight ? buildFlightPayload(formData.outboundFlight) : null,
        return_flight: formData.returnFlight ? buildFlightPayload(formData.returnFlight) : null,
      }

      logger.log('建立行程表資料:', JSON.stringify(createData, null, 2))

      const newItinerary = await create(
        createData as unknown as Omit<Itinerary, 'id' | 'created_at' | 'updated_at'>
      )

      if (newItinerary?.id) {
        logger.log('行程表建立成功:', newItinerary.id)

        syncToCore({
          itinerary_id: newItinerary.id,
          tour_id: null,
          daily_itinerary: formattedDailyItinerary,
        }).catch(err => logger.warn('核心表同步失敗（不影響儲存）:', err))

        await alert('行程表建立成功', 'success')
        onItineraryCreated?.(newItinerary.id)
        onClose()
        return { ok: true, newItineraryId: newItinerary.id }
      } else {
        return { ok: false, errorMessage: '建立失敗：未取得行程表 ID' }
      }
    }
  } catch (error) {
    let errorMessage = '未知錯誤'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (error && typeof error === 'object') {
      const supabaseError = error as { message?: string; code?: string; details?: string }
      errorMessage =
        supabaseError.message ||
        supabaseError.code ||
        supabaseError.details ||
        JSON.stringify(error)
    }
    logger.error('建立行程表失敗:', JSON.stringify(error, null, 2))
    return { ok: false, errorMessage }
  }
}

// ============================================
// 另存新版本
// ============================================

interface SaveVersionParams {
  existingItinerary: Itinerary
  dailySchedule: DailyScheduleItem[]
  versionRecords: ItineraryVersionRecord[]
  ctx: ItineraryEditorContext
  getPreviousAccommodation: (index: number) => string
  onItineraryCreated?: (id?: string) => void
}

export async function saveAsNewVersion(params: SaveVersionParams): Promise<SaveVersionResult> {
  const { existingItinerary, dailySchedule, versionRecords, ctx, getPreviousAccommodation, onItineraryCreated } =
    params

  try {
    const formattedDailyItinerary = formatDailyItinerary({
      dailySchedule,
      startDate: ctx.start_date || null,
      getPreviousAccommodation,
      includeSameAccommodation: true,
    })

    const newVersion: ItineraryVersionRecord = {
      id: crypto.randomUUID(),
      version: versionRecords.length + 1,
      note: `版本 ${versionRecords.length + 1}`,
      daily_itinerary: formattedDailyItinerary,
      features: existingItinerary.features || [],
      focus_cards: existingItinerary.focus_cards || [],
      leader: existingItinerary.leader,
      meeting_info: existingItinerary.meeting_info,
      hotels: existingItinerary.hotels,
      created_at: new Date().toISOString(),
    }

    const updatedRecords = [...versionRecords, newVersion]

    const { error } = await supabase
      .from('itineraries')
      .update({
        version_records: updatedRecords as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingItinerary.id)

    if (error) throw error

    onItineraryCreated?.(existingItinerary.id)
    return { ok: true, updatedRecords, newVersionIndex: updatedRecords.length - 1 }
  } catch (error) {
    logger.error('另存新版本失敗:', error)
    return { ok: false }
  }
}
