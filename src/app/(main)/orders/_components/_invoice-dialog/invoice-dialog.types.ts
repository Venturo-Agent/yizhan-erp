// ============================================
// CreateInvoicesDialog 共用型別
// ============================================

export interface CreatedBatch {
  id: string
  public_token: string
  token_expires_at: string
  invoice_count: number
}

export interface HistoryBatchInvoice {
  id: string
  member_name: string
  total_amount: number
  paid_amount: number
  status: string
}

export interface HistoryBatch {
  id: string
  public_token: string
  token_expires_at: string
  status: string
  notes: string | null
  created_at: string
  total_amount: number
  paid_amount: number
  member_count: number
  invoices: HistoryBatchInvoice[]
}

export interface MemberFlightRow {
  airline: string | null
  flight_number: string | null
  departure_date: string | null
  departure_time: string | null
  arrival_time: string | null
  origin: string | null
  destination: string | null
}

export function formatFlightSegment(f: MemberFlightRow): string {
  const date = f.departure_date ? f.departure_date.slice(5).replace('-', '/') : ''
  const route = `${f.origin || '?'}/${f.destination || '?'}`
  const timeRange =
    f.departure_time || f.arrival_time ? `${f.departure_time || ''}-${f.arrival_time || ''}` : ''
  return [date, route, timeRange].filter(Boolean).join(' ')
}
