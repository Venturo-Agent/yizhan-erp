import { BaseEntity, PageRequest, PageResponse } from '@/types/core.types'
import { NotFoundError } from '@/lib/errors/app-errors'

/**
 * Store 操作介面（非同步版本）
 * 所有 CRUD 操作都回傳 Promise，配合 createStore 的非同步實作
 */
export interface StoreOperations<T> {
  getAll: () => T[]
  getById: (id: string) => T | undefined
  add: (entity: T) => Promise<T | undefined>
  update: (id: string, data: Partial<T>) => Promise<void>
  delete: (id: string) => Promise<void>
}

export abstract class BaseService<T extends BaseEntity> {
  protected abstract resourceName: string
  protected abstract getStore: () => StoreOperations<T>

  // 統一的 ID 生成
  protected generateId(): string {
    // 開發階段使用 crypto.randomUUID，生產環境由後端生成
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    // Fallback for environments without crypto.randomUUID
    return 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // 統一的時間戳
  protected now(): string {
    return new Date().toISOString()
  }

  // 驗證資料（子類可以覆寫）
  protected validate(_data: Partial<T>): void {
    // 基本驗證邏輯，子類可以擴展
  }

  /**
   * 建立新實體
   *
   * @description 自動注入 id、created_at、updated_at，經過 validate() 驗證後寫入 Store。
   *
   * @param data - 實體資料（不含系統欄位）
   * @returns 建立後的完整實體
   * @throws ValidationError 如果驗證失敗
   */
  async create(data: Omit<T, keyof BaseEntity>): Promise<T> {
    try {
      this.validate(data as Partial<T>)

      const entity: T = {
        ...data,
        id: this.generateId(),
        created_at: this.now(),
        updated_at: this.now(),
      } as T

      // await store 操作確保寫入完成
      const store = this.getStore()
      const result = await store.add(entity)

      // 未來：調用 API
      // const response = await api.post(`/${this.resourceName}`, data);

      return result || entity
    } catch (error) {
      throw error instanceof Error ? error : new Error(`Failed to create ${this.resourceName}`)
    }
  }

  /**
   * 列表查詢（支援搜尋、排序、分頁）
   *
   * @param params - 分頁與篩選參數
   * @returns 分頁結果，包含 data、total、page、pageSize
   */
  async list(params?: PageRequest): Promise<PageResponse<T>> {
    try {
      const store = this.getStore()
      let allData = store.getAll()

      // 搜尋過濾
      if (params?.search) {
        allData = allData.filter(item =>
          JSON.stringify(item).toLowerCase().includes(params.search!.toLowerCase())
        )
      }

      // 排序
      if (params?.sortBy) {
        allData.sort((a, b) => {
          const aVal = a[params.sortBy as keyof T]
          const bVal = b[params.sortBy as keyof T]

          if (aVal < bVal) return params.sortOrder === 'desc' ? 1 : -1
          if (aVal > bVal) return params.sortOrder === 'desc' ? -1 : 1
          return 0
        })
      }

      // 分頁
      const page = params?.page || 1
      const pageSize = params?.pageSize || 10
      const start = (page - 1) * pageSize
      const end = start + pageSize

      return {
        data: allData.slice(start, end),
        total: allData.length,
        page,
        pageSize,
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error(`Failed to list ${this.resourceName}`)
    }
  }

  /**
   * 以 ID 查詢單筆實體
   *
   * @param id - 實體 ID
   * @returns 實體或 null
   * @throws NotFoundError 如果 ID 不存在
   */
  async getById(id: string): Promise<T | null> {
    try {
      const store = this.getStore()
      const entity = store.getById(id)

      if (!entity) {
        throw new NotFoundError(this.resourceName, id)
      }

      return entity
    } catch (error) {
      throw error
    }
  }

  /**
   * 更新實體
   *
   * @description 自動更新 updated_at，經過 validate() 驗證。ID 不可被覆寫。
   *
   * @param id - 實體 ID
   * @param data - 要更新的欄位
   * @returns 更新後的完整實體
   * @throws NotFoundError 如果 ID 不存在
   * @throws ValidationError 如果驗證失敗
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    try {
      this.validate(data)

      const store = this.getStore()
      const existing = store.getById(id)

      if (!existing) {
        throw new NotFoundError(this.resourceName, id)
      }

      const timestamp = this.now()
      const updated = {
        ...existing,
        ...data,
        id, // 確保 ID 不會被覆蓋
        updated_at: timestamp,
      } as T

      // 只送「這次有改的欄位」給 store、不把整列 existing 覆寫回 DB。
      // 為什麼：整列覆寫會連 DB 生成欄位（GENERATED ALWAYS、如 list_sort_group）一起送回，
      //         Postgres 會退件 400「can only be updated to DEFAULT」；整列覆寫也會蓋掉他人並發改動。
      //         store.update 只需收到要改的欄位即可、回傳值仍用完整 updated（呼叫端介面不變）。
      const changedFields = { ...data, updated_at: timestamp } as Partial<T>
      await store.update(id, changedFields)
      return updated
    } catch (error) {
      throw error instanceof Error ? error : new Error(`Failed to update ${this.resourceName}`)
    }
  }

  /**
   * 刪除實體
   *
   * @param id - 實體 ID
   * @returns true 表示刪除成功
   * @throws NotFoundError 如果 ID 不存在
   */
  async delete(id: string): Promise<boolean> {
    try {
      const store = this.getStore()
      const existing = store.getById(id)

      if (!existing) {
        throw new NotFoundError(this.resourceName, id)
      }

      // await store 操作確保寫入完成
      await store.delete(id)
      return true
    } catch (error) {
      throw error instanceof Error ? error : new Error(`Failed to delete ${this.resourceName}`)
    }
  }

  /**
   * 批次建立（錯誤不中斷，繼續處理其餘項目）
   *
   * @param items - 要建立的實體陣列
   * @returns 成功建立的實體陣列
   */
  async batchCreate(items: Omit<T, keyof BaseEntity>[]): Promise<T[]> {
    const results: T[] = []

    for (const item of items) {
      try {
        const created = await this.create(item)
        results.push(created)
      } catch (_error) {
        // Continue processing other items on error
      }
    }

    return results
  }

  async batchUpdate(updates: { id: string; data: Partial<T> }[]): Promise<T[]> {
    const results: T[] = []

    for (const { id, data } of updates) {
      try {
        const updated = await this.update(id, data)
        results.push(updated)
      } catch (_error) {
        // Continue processing other items on error
      }
    }

    return results
  }

  async batchDelete(ids: string[]): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = []
    const failed: string[] = []

    for (const id of ids) {
      try {
        await this.delete(id)
        success.push(id)
      } catch (_error) {
        failed.push(id)
      }
    }

    return { success, failed }
  }
}
