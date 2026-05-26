/**
 * 付款方式種類（kind）enum + 中文 label
 *
 * William 拍板 2026-05-18：五種固定 kind、不允許自由文字
 *  - wire_transfer 匯款（自動算分攤）
 *  - card          刷卡（將來記刷卡手續費）
 *  - cash          現鈔
 *  - check         支票 — 未來有獨立記錄項目
 *  - other         其他（name 由 user 自填）
 *
 * 注意：cash_foreign（現鈔外幣）已移除。需要時由各公司自行新增「現鈔」種類方式並改名。
 *
 * 抽到 src/constants/：跨模組共用（settings / 出納單 / 列印頁 / 報表 / 未來 API 整合）
 */

export type PaymentMethodKind = 'wire_transfer' | 'card' | 'cash' | 'check' | 'other'

export const PAYMENT_METHOD_KIND_LABELS: Record<PaymentMethodKind, string> = {
  wire_transfer: '匯款',
  card: '刷卡',
  cash: '現鈔',
  check: '支票',
  other: '其他',
}

export const PAYMENT_METHOD_KINDS: readonly PaymentMethodKind[] = [
  'wire_transfer',
  'card',
  'cash',
  'check',
  'other',
]
