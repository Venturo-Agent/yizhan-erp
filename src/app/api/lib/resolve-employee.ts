import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 從 auth user id 解析對應的 employees.id
 *
 * 容錯邏輯：employees.user_id == X OR employees.id == X
 * 第二條 fallback 是處理「auth user id 跟 employee id 同值」的資料情況。
 *
 * 使用情境：API route 已經透過 requireCapability / getServerAuth 拿到 user.id、
 * 但要寫入帶 created_by / updated_by 等審計欄位、需要 employees.id。
 *
 * @returns 對應的 employees.id、找不到回 null
 */
export async function resolveEmployeeIdFromUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('id')
    .or(`user_id.eq.${userId},id.eq.${userId}`)
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data.id
}
