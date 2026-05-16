/**
 * AbortController 管理器
 * 負責管理和清理 AbortController，防止記憶體洩漏
 */

export class AbortManager {
  private controller: AbortController | undefined

  /**
   * 取消當前請求並清理
   */
  abort(): void {
    if (this.controller) {
      this.controller.abort()
      this.controller = undefined // 💡 顯式清除參考，讓 GC 可以回收
    }
  }

  /**
   * 建立新的 AbortController
   */
  create(): AbortController {
    // 先取消舊的
    this.abort()

    // 建立新的
    this.controller = new AbortController()
    return this.controller
  }

  /**
   * 取得當前的 signal（如果存在）
   */
  get signal(): AbortSignal | undefined {
    return this.controller?.signal
  }

  /**
   * 檢查是否有進行中的請求
   */
  get isActive(): boolean {
    return this.controller !== undefined
  }
}
