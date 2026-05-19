'use client'

/**
 * entityHookCrud — CRUD 操作函式（create / update / remove / batchRemove / invalidate）
 *
 * 從 createEntityHook.ts 抽出。
 * 每個函式接受一個 CrudContext 描述 factory-level 狀態、避免 closure 捆綁。
 *
 * CrudContext 由 createEntityHook 在工廠啟動時組裝好、傳入各操作。
 */

import { mutate as globalMutate } from '@/lib/swr/scoped-mutate'
import { supabase } from '@/lib/supabase/client'
import { invalidate_cache_pattern } from '@/lib/cache/indexeddb-cache'
import { logger } from '@/lib/utils/logger'
import { generateUUID, getCurrentUserContext, TABLE_CODE_PREFIX } from './entityHookCache'
import { getRegisteredKeysForTable } from './entityHookRegistry'
import type { BaseEntity, EntityCreateData } from './types'

// ============================================
// CrudContext — 所有 CRUD 函式共用的 factory 狀態
// ============================================

export interface CrudContext {
  tableName: string
  cacheKeyPrefix: string
  cacheKeyList: string
  isWorkspaceScoped: boolean
  skipAudit: boolean
  /** Primary key 欄位名、預設 'id'。非 id PK 表（ref_*）必傳 */
  pkColumn: string
}

// ============================================
// invalidate — 使快取失效（SWR + IDB）
// ============================================

export async function invalidateEntity(ctx: CrudContext): Promise<void> {
  // 5/18 重做（William 拍板「完整修復」）：
  //
  // 原本走 globalMutate(predicate, undefined, { revalidate: true })、靠 SWR
  // iterate cache 比對 prefix 觸發 revalidation。實測對 entity hook 的 cache
  // key 結構（包 select hash + filter JSON）行為不可靠、寫完看不到 server
  // 真實狀態、要 F5。
  //
  // 改用 entityHookRegistry：useList / useListSlim / useDictionary mount 時
  // 把具體 swrKey 註冊進 module-level Map、unmount 移除。invalidateEntity
  // 從該 table 對應的 Set 撈所有 swrKey、對每個 string key 直接呼叫
  // globalMutate(key) — SWR 對單一 string key 的行為穩定可靠、跟 line ai hub
  // apiMutate 同概念。
  const keys = getRegisteredKeysForTable(ctx.tableName)
  await Promise.all([
    ...keys.map(key => globalMutate(key)),
    invalidate_cache_pattern(ctx.cacheKeyPrefix),
  ])
}

// ============================================
// create — 建立（支援 code 自動生成 + 樂觀更新）
// ============================================

export async function createEntity<T extends BaseEntity>(
  ctx: CrudContext,
  data: EntityCreateData<T>
): Promise<T> {
  const now = new Date().toISOString()

  const dataRecord = data as Record<string, unknown>
  const { workspaceId: ctxWorkspaceId, userId: ctxUserId } = getCurrentUserContext()
  let workspace_id = dataRecord.workspace_id
  if (ctx.isWorkspaceScoped && !workspace_id) {
    workspace_id = ctxWorkspaceId
  }

  // 自動生成 code
  const codePrefix = TABLE_CODE_PREFIX[ctx.tableName]
  const needsCodeGeneration = codePrefix && !dataRecord.code

  const maxInsertRetries = 3
  let lastError: unknown = null

  for (let insertAttempt = 0; insertAttempt < maxInsertRetries; insertAttempt++) {
    let generatedCode: string | undefined

    if (needsCodeGeneration) {
      const { data: maxCodeResults } = await supabase
        .from(ctx.tableName as never /* dynamic table name requires runtime assertion */)
        .select('code')
        .like('code', `${codePrefix}%`)
        .order('code', { ascending: false })
        .limit(1)

      let nextNumber = 1
      const codeResults = maxCodeResults as Array<{ code?: string }> | null
      if (codeResults && codeResults.length > 0 && codeResults[0]?.code) {
        const numericPart = codeResults[0].code.replace(codePrefix, '')
        const currentMax = parseInt(numericPart, 10)
        if (!isNaN(currentMax)) {
          nextNumber = currentMax + 1
        }
      }

      // 加入偏移量避免並發衝突
      if (insertAttempt > 0) {
        nextNumber += insertAttempt
      }

      generatedCode = `${codePrefix}${String(nextNumber).padStart(6, '0')}`
    }

    const newItem = {
      ...data,
      id: generateUUID(),
      created_at: now,
      updated_at: now,
      ...(ctx.isWorkspaceScoped && workspace_id ? { workspace_id } : {}),
      ...(generatedCode ? { code: generatedCode } : {}),
      ...(!ctx.skipAudit && ctxUserId ? { created_by: ctxUserId, updated_by: ctxUserId } : {}),
    }

    // 樂觀更新：用 prefix match、覆蓋所有 filter 變體的 cache
    globalMutate(
      (key: unknown) =>
        typeof key === 'string' &&
        (key === ctx.cacheKeyList || key.startsWith(ctx.cacheKeyList + ':')),
      (currentItems: T[] | undefined) => [...(currentItems || []), newItem as T],
      { revalidate: false }
    )

    try {
      const { data: created, error } = await supabase
        .from(ctx.tableName as never /* dynamic table name requires runtime assertion */)
        .insert(newItem as never)
        .select()
        .single()

      if (!error) {
        // 樂觀 push 進 list / slim cache（避免 UI 跟 SWR refetch race、新增完不用等 refetch 就看得到）
        // 注意：list / slim select 欄位不同、push 同一個 row 進兩個 cache、Supplier slim 沒包的欄位不會被存取（caller 自我克制）
        const createdRow = created as unknown as T
        globalMutate(
          (key: unknown) =>
            typeof key === 'string' &&
            (key === ctx.cacheKeyList || key.startsWith(ctx.cacheKeyList + ':')),
          (current: T[] | undefined) => [...(current || []), createdRow],
          { revalidate: true }
        )
        globalMutate(
          (key: unknown) =>
            typeof key === 'string' && key.startsWith(ctx.cacheKeyPrefix + ':slim'),
          (current: T[] | undefined) => [...(current || []), createdRow],
          { revalidate: true }
        )
        // 5/18 修：樂觀更新 + globalMutate predicate 不可靠、補一次全 cache revalidate
        await invalidateEntity(ctx)
        return createdRow
      }

      const errorCode = (error as { code?: string })?.code
      const errorMessage = (error as { message?: string })?.message || ''
      const isUniqueViolation =
        errorCode === '23505' ||
        errorMessage.includes('duplicate key') ||
        errorMessage.includes('unique constraint')

      if (isUniqueViolation && needsCodeGeneration && insertAttempt < maxInsertRetries - 1) {
        logger.warn(`[${ctx.tableName}] Code 重複，重試第 ${insertAttempt + 1} 次`)
        await invalidateEntity(ctx)
        lastError = error
        continue
      }

      await invalidateEntity(ctx)
      throw error
    } catch (err) {
      await invalidateEntity(ctx)
      throw err
    }
  }

  throw lastError || new Error('建立失敗：已達最大重試次數')
}

// ============================================
// update — 更新（樂觀更新）
// ============================================

export async function updateEntity<T extends BaseEntity>(
  ctx: CrudContext,
  id: string,
  data: Partial<T>
): Promise<T> {
  const { userId: currentUserId } = getCurrentUserContext()
  const updateData = {
    ...data,
    updated_at: new Date().toISOString(),
    ...(!ctx.skipAudit && currentUserId ? { updated_by: currentUserId } : {}),
  }

  // 樂觀更新
  globalMutate(
    (key: unknown) =>
      typeof key === 'string' &&
      (key === ctx.cacheKeyList || key.startsWith(ctx.cacheKeyList + ':')),
    (currentItems: T[] | undefined) =>
      (currentItems || []).map(item => (item.id === id ? { ...item, ...updateData } : item)),
    { revalidate: false }
  )

  try {
    const { error } = await supabase
      .from(ctx.tableName as never /* dynamic table name requires runtime assertion */)
      .update(updateData as never)
      .eq(ctx.pkColumn, id)

    if (error) {
      logger.error(`[${ctx.tableName}] Update error:`, error.message)
      await invalidateEntity(ctx)
      throw error
    }

    // 5/18 修：成功也要 invalidate、不然 UI 卡 stale cache 要 F5
    // 樂觀更新已經把 row update 進去、但 trigger / FK cascade / DB default 後可能跟 server 真實值不同
    // server-side 真正狀態必須 refetch 才確認
    await invalidateEntity(ctx)
    return { id, ...updateData } as unknown as T
  } catch (err) {
    await invalidateEntity(ctx)
    throw err
  }
}

// ============================================
// remove — 刪除（樂觀更新）
// ============================================

export async function removeEntity<T extends BaseEntity>(
  ctx: CrudContext,
  id: string
): Promise<boolean> {
  // 樂觀更新
  globalMutate(
    (key: unknown) =>
      typeof key === 'string' &&
      (key === ctx.cacheKeyList || key.startsWith(ctx.cacheKeyList + ':')),
    (currentItems: T[] | undefined) => (currentItems || []).filter(item => item.id !== id),
    { revalidate: false }
  )

  try {
    const { error } = await supabase
      .from(ctx.tableName as never /* dynamic table name requires runtime assertion */)
      .delete()
      .eq(ctx.pkColumn, id)

    if (error) {
      logger.error(`[${ctx.tableName}] Delete error:`, error.message)
      await invalidateEntity(ctx)
      throw error
    }

    // 5/18 修：成功也要 invalidate（跟 update 同理）
    await invalidateEntity(ctx)
    return true
  } catch (err) {
    await invalidateEntity(ctx)
    throw err
  }
}

// ============================================
// batchRemove — 批量刪除
// ============================================

export async function batchRemoveEntities<T extends BaseEntity>(
  ctx: CrudContext,
  ids: string[]
): Promise<boolean> {
  if (ids.length === 0) return true

  // 樂觀更新
  globalMutate(
    (key: unknown) =>
      typeof key === 'string' &&
      (key === ctx.cacheKeyList || key.startsWith(ctx.cacheKeyList + ':')),
    (currentItems: T[] | undefined) =>
      (currentItems || []).filter(item => !ids.includes(item.id)),
    { revalidate: false }
  )

  try {
    const { error } = await supabase
      .from(ctx.tableName as never /* dynamic table name requires runtime assertion */)
      .delete()
      .in('id', ids)

    if (error) {
      logger.error(`[${ctx.tableName}] BatchRemove error:`, error.message)
      await invalidateEntity(ctx)
      throw error
    }

    // 5/18 修：成功也要 invalidate（跟 update / remove 同理）
    await invalidateEntity(ctx)
    return true
  } catch (err) {
    await invalidateEntity(ctx)
    throw err
  }
}
