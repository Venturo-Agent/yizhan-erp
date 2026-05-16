
// 資源類型
type CostItemResourceType = 'restaurant' | 'hotel' | 'attraction' | 'supplier'

export interface CostItem {
  id: string
  name: string
  quantity: number | null
  unit_price: number | null
  total: number
  note?: string
  description?: string // 項目描述（如：餐廳名稱、活動說明）
  notes?: string // 備註（與 note 相容）
  order?: number // 排序順序
  // 住宿專用：天數和房型數據
  day?: number // 第幾天
  room_type?: string // 房型名稱（如：雙人房、三人房）
  is_same_as_previous?: boolean // 續住（與前一天相同飯店）
  // 交通和領隊導遊專用：團體分攤
  is_group_cost?: boolean // 是否為團體費用
  // 餐飲專用：自理餐標記
  is_self_arranged?: boolean // 是否為自理（標記後價格為 0，但會顯示在確認單上）
  // 多身份計價：機票專用
  pricing_type?: 'uniform' | 'by_identity' // uniform: 統一價格, by_identity: 依身份計價
  adult_price?: number | null // 成人價
  child_price?: number | null // 小朋友價
  infant_price?: number | null // 嬰兒價

  // === Excel 式公式儲存（顯示計算結果，點擊顯示公式）===
  quantity_formula?: string // 數量公式（如 "10+5"）
  unit_price_formula?: string // 單價公式
  adult_price_formula?: string // 成人價公式
  child_price_formula?: string // 兒童價公式
  infant_price_formula?: string // 嬰兒價公式

  // === 核心表關聯 ===
  itinerary_item_id?: string // 對應 tour_itinerary_items.id
  sub_category?: string // 餐飲: breakfast/lunch/dinner；住宿: 房型

  // === 價格追蹤（視覺提示用）===
  estimated_cost?: number | null // 業務預估（初始值，不變）
  quoted_cost?: number | null // 廠商報價（待確認）

  // === 資源關聯（餐廳/飯店/景點）===
  resource_type?: CostItemResourceType // 資源類型
  resource_id?: string // 關聯的資源 ID（指向對應表格）
  // GPS 快取（從資源表複製，供團確單/領隊使用）
  resource_latitude?: number
  resource_longitude?: number
  resource_address?: string
  resource_phone?: string
  resource_google_maps_url?: string

  // === 顯示控制 ===
  show_on_quote?: boolean // false = 已隱藏（無需門票/無需訂位）
}

export interface CostCategory {
  id: string
  name: string
  items: CostItem[]
  total: number
  hiddenItems?: CostItem[] // 已隱藏的項目（無需門票/無需訂位）
}

export interface ParticipantCounts {
  adult: number // 成人（雙人房）
  child_with_bed: number // 小朋友（佔床）
  child_no_bed: number // 不佔床
  single_room: number // 單人房
  infant: number // 嬰兒
}

interface RoomTypePrice {
  adult: number
  child: number
}

export interface SellingPrices {
  adult: number
  child_with_bed: number
  child_no_bed: number
  single_room: number
  infant: number
  // 動態房型價格（key: 房型名稱）
  room_types?: Record<string, RoomTypePrice>
}

export interface IdentityCosts {
  adult: number
  child_with_bed: number
  child_no_bed: number
  single_room: number
  infant: number
}

export interface IdentityProfits {
  adult: number
  child_with_bed: number
  child_no_bed: number
  single_room: number
  infant: number
}

export interface AccommodationSummaryItem {
  name: string
  total_cost: number
  averageCost: number
  days: number
  capacity: number // 房型人數（從 quantity 取得）
}

export const costCategories: CostCategory[] = [
  { id: 'transport', name: '交通', items: [], total: 0 },
  { id: 'group-transport', name: '團體分攤', items: [], total: 0 },
  { id: 'accommodation', name: '住宿', items: [], total: 0 },
  { id: 'meals', name: '餐飲', items: [], total: 0 },
  { id: 'activities', name: '活動', items: [], total: 0 },
  { id: 'others', name: '其他', items: [], total: 0 },
  { id: 'guide', name: '領隊導遊', items: [], total: 0 },
]

export const categoryIcons: Record<string, string> = {
  transport: 'Car',
  'group-transport': 'Users',
  accommodation: 'Home',
  meals: 'UtensilsCrossed',
  activities: 'MapPin',
  others: 'MoreHorizontal',
  guide: 'Users',
}

// 檻次表（Tier Pricing Table）- 用於比較不同人數的報價
export interface TierPricing {
  id: string // 唯一識別
  participant_count: number // 總人數（用於重新計算成本）
  participant_counts: ParticipantCounts // 各身份人數分布
  identity_costs: IdentityCosts // 重新計算的各身份成本
  selling_prices: SellingPrices // 各身份售價
  identity_profits: IdentityProfits // 各身份利潤
}
