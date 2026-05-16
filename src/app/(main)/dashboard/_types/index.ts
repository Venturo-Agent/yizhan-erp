// 可用的小工具類型
export type WidgetType = 'calculator' | 'notes' | 'amadeus-totp'

export interface WidgetConfig {
  id: WidgetType
  name: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  component: React.ComponentType
  span?: number // 佔據的列數（1 或 2）
  requiredPermission?: string // 需要的權限（如 'admin_only'）
}

// 統計項目類型
type StatType =
  | 'todos'
  | 'paymentsThisWeek'
  | 'paymentsNextWeek'
  | 'depositsThisWeek'
  | 'toursThisWeek'
  | 'toursThisMonth'

export interface StatConfig {
  id: StatType
  label: string
  value: string | number
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string
  bgColor: string
}

// 便條紙分頁類型
export interface NoteTab {
  id: string
  name: string
  content: string
}
