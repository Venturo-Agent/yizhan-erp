/**
 * 計算分房/分車欄位的合併行數（rowSpan）
 */

import type { OrderMember } from '../_types/order-member.types'

interface HotelColumn {
  id: string
  name: string
}

interface ComputeRowSpansParams {
  sortedMembers: OrderMember[]
  roomAssignments: Record<string, string>
  vehicleAssignments: Record<string, string>
  hotelColumns: HotelColumn[]
  roomAssignmentsByHotel: Record<string, Record<string, string>>
}

interface RowSpanResult {
  roomSpans: Record<string, number>
  vehicleSpans: Record<string, number>
  roomSpansByHotel: Record<string, Record<string, number>>
}

/**
 * 計算連續相同分組的 rowSpan
 */
function computeSpans(
  sortedMembers: OrderMember[],
  assignments: Record<string, string>
): Record<string, number> {
  const spans: Record<string, number> = {}
  let i = 0
  while (i < sortedMembers.length) {
    const current = assignments[sortedMembers[i].id]
    if (!current) {
      spans[sortedMembers[i].id] = 1
      i++
      continue
    }
    let count = 1
    while (
      i + count < sortedMembers.length &&
      assignments[sortedMembers[i + count].id] === current
    ) {
      count++
    }
    spans[sortedMembers[i].id] = count
    for (let j = 1; j < count; j++) {
      spans[sortedMembers[i + j].id] = 0
    }
    i += count
  }
  return spans
}

export function computeRowSpans({
  sortedMembers,
  roomAssignments,
  vehicleAssignments,
  hotelColumns,
  roomAssignmentsByHotel,
}: ComputeRowSpansParams): RowSpanResult {
  const roomSpansByHotel: Record<string, Record<string, number>> = {}

  // 每個飯店的分房合併
  hotelColumns.forEach(hotel => {
    const hotelAssigns = roomAssignmentsByHotel[hotel.id] || {}
    roomSpansByHotel[hotel.id] = computeSpans(sortedMembers, hotelAssigns)
  })

  return {
    roomSpans: computeSpans(sortedMembers, roomAssignments),
    vehicleSpans: computeSpans(sortedMembers, vehicleAssignments),
    roomSpansByHotel,
  }
}
