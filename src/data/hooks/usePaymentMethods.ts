import { useMemo } from 'react'
import useSWR from 'swr'
import { useAuthStore } from '@/stores'

interface PaymentMethod {
  id: string
  code: string
  name: string
  type: 'receipt' | 'payment'
  description: string | null
  placeholder?: string | null
  is_active: boolean
  is_system: boolean
  sort_order: number
  // 種類 enum（分類用、各 kind 邏輯未來再接）
  kind?: 'wire_transfer' | 'card' | 'cash' | 'cash_foreign' | 'check' | 'other' | null
  fee_fixed?: number
  fee_account_id?: string | null
}

type PaymentMethodType = 'receipt' | 'payment'

const fetcher = async (url: string): Promise<PaymentMethod[]> => {
  const res = await fetch(url)
  if (!res.ok) return []
  return res.json()
}

/**
 * SWR hook for fetching payment methods with caching.
 * Replaces direct fetch() / supabase queries for payment_methods.
 */
export function usePaymentMethodsCached(type?: PaymentMethodType) {
  const workspaceId = useAuthStore(state => state.user?.workspace_id)

  const params = new URLSearchParams()
  if (workspaceId) params.set('workspace_id', workspaceId)
  if (type) params.set('type', type)

  const key = workspaceId ? `payment-methods-${workspaceId}-${type ?? 'all'}` : null

  const { data, isLoading } = useSWR<PaymentMethod[]>(
    key,
    () => fetcher(`/api/finance/payment-methods?${params.toString()}`),
    { revalidateOnFocus: false }
  )

  // 去重 + useMemo 穩定引用（避免 useEffect 無限循環）
  const uniqueMethods = useMemo(() => {
    return (data ?? []).filter(
      (method, index, arr) => arr.findIndex(m => m.id === method.id) === index
    )
  }, [data])

  return {
    methods: uniqueMethods,
    loading: isLoading,
  }
}
