/**
 * useMemberTableActions — DnD 拖曳排序、鍵盤導航、批量貼上
 *
 * 從 OrderMembersExpandable 拆出，封裝表格互動的事件處理邏輯。
 */

import { useCallback } from 'react'
import { toast } from 'sonner'
import { DragEndEvent } from '@dnd-kit/core'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { OrderMember } from '../_types/order-member.types'

const PASTE_ERROR_MSG = '批量貼上失敗'

// 可用於鍵盤導航的欄位清單
export const EDITABLE_FIELDS = [
  'chinese_name',
  'passport_name',
  'birth_date',
  'gender',
  'id_number',
  'passport_number',
  'passport_expiry',
  'special_meal',
] as const

interface RoomVehicleForDnd {
  showRoomColumn: boolean
  hotelColumns: Array<{ id: string }>
  roomAssignmentsByHotel: Record<string, Record<string, string>>
  roomSortKeys: Record<string, number>
  reorderRoomsByMembers: (memberIds: string[]) => void
  handleReorderMembers?: never // 不屬於這個 hook
}

interface MembersDataForDnd {
  members: OrderMember[]
  handleReorderMembers: (newMembers: OrderMember[]) => void
  loadMembers: () => void
}

interface UseMemberTableActionsParams {
  members: OrderMember[]
  membersData: MembersDataForDnd
  roomVehicle: RoomVehicleForDnd
  sortedMembers: OrderMember[]
  isComposing: boolean
}

export function useMemberTableActions({
  members,
  membersData,
  roomVehicle,
  sortedMembers,
  isComposing,
}: UseMemberTableActionsParams) {
  // 處理拖曳結束（支援整間房一起移動）
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (!over || active.id === over.id) return

      const draggedId = active.id as string
      const targetId = over.id as string

      // 找出所有同房成員（用第一個飯店的分房判斷）
      let draggedMembers: string[] = [draggedId]
      if (roomVehicle.showRoomColumn && roomVehicle.hotelColumns.length > 0) {
        const firstHotel = roomVehicle.hotelColumns[0]
        const hotelAssignments = roomVehicle.roomAssignmentsByHotel[firstHotel.id] || {}
        const draggedRoom = hotelAssignments[draggedId]

        if (draggedRoom) {
          draggedMembers = members
            .filter(m => hotelAssignments[m.id] === draggedRoom)
            .map(m => m.id)
        }
      }

      const targetIndex = members.findIndex(m => m.id === targetId)
      if (targetIndex === -1) return

      const newMembers = members.filter(m => !draggedMembers.includes(m.id))
      let insertIndex = newMembers.findIndex(m => m.id === targetId)

      if (insertIndex === -1) {
        insertIndex = Math.min(targetIndex, newMembers.length)
      }

      const oldFirstIndex = members.findIndex(m => m.id === draggedMembers[0])
      const isMovingDown = targetIndex > oldFirstIndex

      const draggedMemberObjects = draggedMembers
        .map(id => members.find(m => m.id === id))
        .filter(Boolean) as OrderMember[]

      if (isMovingDown) {
        newMembers.splice(insertIndex + 1, 0, ...draggedMemberObjects)
      } else {
        newMembers.splice(insertIndex, 0, ...draggedMemberObjects)
      }

      membersData.handleReorderMembers(newMembers)

      if (roomVehicle.showRoomColumn && Object.keys(roomVehicle.roomSortKeys).length > 0) {
        roomVehicle.reorderRoomsByMembers(newMembers.map(m => m.id))
      }
    },
    [members, membersData, roomVehicle]
  )

  // 鍵盤導航（Excel-like、方向鍵在欄位間移動）
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, memberIndex: number, fieldName: string) => {
      if (isComposing) return
      const currentFieldIndex = EDITABLE_FIELDS.indexOf(fieldName as typeof EDITABLE_FIELDS[number])
      if (currentFieldIndex === -1) return

      let nextMemberIndex = memberIndex
      let nextFieldIndex = currentFieldIndex

      const navigate = (mDelta: number, fDelta: number) => {
        nextMemberIndex = (memberIndex + mDelta + members.length) % members.length
        nextFieldIndex =
          (currentFieldIndex + fDelta + EDITABLE_FIELDS.length) % EDITABLE_FIELDS.length
      }

      const input = e.target as HTMLInputElement
      const cursorAtEnd = input.selectionStart === input.value.length
      const cursorAtStart = input.selectionStart === 0

      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault()
        navigate(1, 0)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        navigate(-1, 0)
      } else if (e.key === 'ArrowRight') {
        if (!cursorAtEnd) return
        e.preventDefault()
        nextFieldIndex = currentFieldIndex + 1
        if (nextFieldIndex >= EDITABLE_FIELDS.length) {
          nextFieldIndex = 0
          navigate(1, 0)
        }
      } else if (e.key === 'ArrowLeft') {
        if (!cursorAtStart) return
        e.preventDefault()
        nextFieldIndex = currentFieldIndex - 1
        if (nextFieldIndex < 0) {
          nextFieldIndex = EDITABLE_FIELDS.length - 1
          navigate(-1, 0)
        }
      } else return

      const selector = `input[data-member="${members[nextMemberIndex].id}"][data-field="${EDITABLE_FIELDS[nextFieldIndex]}"]`
      document.querySelector<HTMLInputElement>(selector)?.focus()
    },
    [isComposing, members]
  )

  // 批量貼上功能（Excel-like，多行貼上同欄）
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent, memberIndex: number, fieldName: string) => {
      const pastedText = e.clipboardData.getData('text')
      const lines = pastedText.split(/[\r\n]+/).filter(line => line.trim())

      if (lines.length <= 1) return
      e.preventDefault()

      const updates: Array<{ id: string; [key: string]: string }> = []
      for (let i = 0; i < lines.length && memberIndex + i < sortedMembers.length; i++) {
        const member = sortedMembers[memberIndex + i]
        updates.push({ id: member.id, [fieldName]: lines[i].trim() })
      }

      try {
        const promises = updates.map(update =>
          supabase
            .from('order_members')
            .update({ [fieldName]: update[fieldName] })
            .eq('id', update.id)
        )
        await Promise.all(promises)
        await membersData.loadMembers()
        toast.success(`已貼上 ${updates.length} 筆資料`)
      } catch (error) {
        logger.error(PASTE_ERROR_MSG, error)
        toast.error(PASTE_ERROR_MSG)
      }
    },
    [sortedMembers, membersData]
  )

  return { handleDragEnd, handleKeyDown, handlePaste }
}
