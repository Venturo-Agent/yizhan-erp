'use client'
/**
 * createFormHook — 表單 state 工廠
 *
 * 適合「新增」型 Dialog 的簡單表單（無需 API 載入初始值）。
 *
 * 使用範例（取代 CreateCheckDialog 內嵌 state）：
 *   const useCheckForm = createFormHook({
 *     initialForm: {
 *       check_number: '',
 *       check_date: new Date().toISOString().split('T')[0],
 *       due_date: '',
 *       amount: '',
 *       payee_name: '',
 *       memo: '',
 *     } as const,
 *   })
 *   // 在 component 內：
 *   const { formData, updateField, resetForm, isDirty } = useCheckForm()
 *
 * 注意：若 initialForm 需要動態值（如今天日期每次都不同），
 * 需在外面 useMemo 建立 options 再傳入、或直接 setFormData 覆蓋。
 *
 * 已知不適合的場景：
 *   - 編輯模式（需 useEffect 載入現有值）→ 繼續用 useState + useEffect
 *   - 有巢狀 list（items array）的複雜 form → 用 items 參數但邏輯較多
 *   - 有 server-side validation + 錯誤 state → 直接 useState 更清楚
 *
 * TODO（搬遷機會）：
 *   - CreateCheckDialog（已用 useAsyncSubmit、formData 部分可遷）
 *   - CreateAccountDialog（同上）
 *   - 估計 ~100-150 行節省（formData 宣告 + resetForm + updateField 三組重複）
 */
import { useState, useCallback } from 'react'

interface CreateFormHookOptions<TForm, TItem> {
  initialForm: TForm
  initialItems?: TItem[]
}

export function createFormHook<TForm extends Record<string, unknown>, TItem = never>(
  options: CreateFormHookOptions<TForm, TItem>
) {
  return function useForm() {
    const [formData, setFormData] = useState<TForm>(options.initialForm)
    const [items, setItems] = useState<TItem[]>(options.initialItems ?? [])
    const [isDirty, setIsDirty] = useState(false)

    const resetForm = useCallback(() => {
      setFormData(options.initialForm)
      setItems(options.initialItems ?? [])
      setIsDirty(false)
    }, [])

    const updateField = useCallback(<K extends keyof TForm>(key: K, value: TForm[K]) => {
      setFormData(prev => ({ ...prev, [key]: value }))
      setIsDirty(true)
    }, [])

    return { formData, setFormData, updateField, items, setItems, resetForm, isDirty }
  }
}
