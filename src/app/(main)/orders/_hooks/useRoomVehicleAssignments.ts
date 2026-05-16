/**
 * 分房分車功能（冷凍）
 *
 * 此 hook 為佔位、回傳安全空資料、保留 caller layout 不破。
 * 真實實作在 features 規劃內、本檔由業務拍板實作時填回。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export type HotelColumn = { id: string; name: string; shortName: string }
export type RoomOption = any
export type RoomMemberInfo = any

export function useRoomVehicleAssignments(_args?: any) {
  return {
    roomAssignments: {} as Record<string, string>,
    vehicleAssignments: {} as Record<string, string>,
    roomAssignmentsByHotel: {} as Record<string, Record<string, string>>,
    vehicleAssignmentsByDate: {} as Record<string, Record<string, string>>,
    showRoomColumn: false,
    showVehicleColumn: false,
    hotelColumns: [] as HotelColumn[],
    roomIdByHotelMember: {} as Record<string, Record<string, string>>,
    roomMembersByHotelRoom: {} as Record<string, Record<string, RoomMemberInfo[]>>,
    roomOptionsByHotel: {} as Record<string, RoomOption[]>,
    roomRowSpansByHotel: {} as Record<string, Record<string, number>>,
    roomSortKeys: {} as Record<string, number>,
    assignMemberToRoom: async (..._args: any[]) => {},
    removeMemberFromRoom: async (..._args: any[]) => {},
    reorderRoomsByMembers: (..._args: any[]) => {},
    showRoomManager: false,
    setShowRoomManager: (..._args: any[]) => {},
    loadRoomAssignments: () => {},
    loadVehicleAssignments: () => {},
    loading: false,
    refresh: () => {},
    saveRoomAssignment: async () => {},
    saveVehicleAssignment: async () => {},
  }
}
