/**
 * dashboard.service.ts - 儀表板資料存取服務
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { mutate as globalMutate } from 'swr'
import { invalidate_cache_pattern } from '@/lib/cache/indexeddb-cache'

/** 刪除使用者所有筆記 */
export async function deleteUserNotes(userId: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('user_id', userId)
  if (error) {
    logger.warn('[dashboard.service] 刪除筆記失敗:', error.message)
    throw error
  }
  globalMutate(
    (key: string) => typeof key === 'string' && key.startsWith('entity:notes'),
    undefined,
    { revalidate: true }
  )
  invalidate_cache_pattern('entity:notes')
}

/** 批量插入筆記 */
export async function insertNotes(
  notes: Array<{
    user_id: string
    workspace_id: string | undefined
    tab_id: string
    tab_name: string
    content: string
    tab_order: number
  }>
): Promise<void> {
  const { error } = await supabase.from('notes').insert(notes)
  if (error) {
    logger.warn('[dashboard.service] 插入筆記失敗:', error.message)
    throw error
  }
  globalMutate(
    (key: string) => typeof key === 'string' && key.startsWith('entity:notes'),
    undefined,
    { revalidate: true }
  )
  invalidate_cache_pattern('entity:notes')
}

/** 儲存使用者 widget 偏好 */
export async function saveWidgetPreferences(
  userId: string,
  preferenceKey: string,
  widgets: string[]
): Promise<void> {
  const { error } = await supabase.from('user_preferences').upsert(
    {
      user_id: userId,
      preference_key: preferenceKey,
      preference_value: widgets,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id,preference_key',
    }
  )

  if (error) {
    logger.warn('[dashboard.service] 儲存 widget 偏好失敗:', error.message)
    throw error
  }
}
