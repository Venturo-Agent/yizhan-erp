/**
 * useTourOptions — 把 tours 陣列轉換成 Combobox options 的共用 hook
 *
 * label 格式統一：「${tour.code || ''} - ${tour.name || ''}」
 * 有 filter 邏輯（active/自訂）的地方保留 filter、只把 .map() 這步換成此 hook。
 *
 * 使用範例：
 *   const { items: tours } = useToursSlim()
 *   const tourOptions = useTourOptions(tours)
 *
 *   // 有 filter 的場合：先 filter 再傳進來
 *   const activeTours = tours.filter(t => !t.archived)
 *   const tourOptions = useTourOptions(activeTours)
 */

export function useTourOptions(
  tours?: Array<{ id: string; code?: string | null; name?: string | null }>
) {
  return (tours || []).map(tour => ({
    value: tour.id,
    label: `${tour.code || ''} - ${tour.name || ''}`,
  }))
}
