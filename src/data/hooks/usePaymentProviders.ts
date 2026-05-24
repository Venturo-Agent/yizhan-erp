import useSWR from 'swr'
import type { PlatformPaymentProvider } from '@/app/(main)/finance/settings/_components/types'

const fetcher = async (url: string): Promise<PlatformPaymentProvider[]> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('讀取金流商失敗')
  return res.json()
}

/**
 * 抓平台級金流商清單（誰處理金流：manual / 第三方）。
 * 平台共用參考資料、跨租戶、非 workspace 實體 → 走 REST endpoint，createEntityHook 不適用。
 * （比照 useRoles：src/data/hooks 內 wrap REST endpoint、避開「頁面禁直接 useSWR」紅線 F）
 */
export function usePaymentProviders() {
  const { data } = useSWR<PlatformPaymentProvider[]>(
    '/api/finance/payment-providers',
    fetcher,
    { revalidateOnFocus: false }
  )

  return { providers: data ?? [] }
}
