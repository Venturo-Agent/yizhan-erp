/**
 * 資料表名稱常數（給 Store 用、型別安全）
 */

/**
 * 資料表名稱常數（用於型別安全）
 */
export const TABLES = {
  EMPLOYEES: 'employees',
  TOURS: 'tours',
  ITINERARIES: 'itineraries',
  ORDERS: 'orders',
  CUSTOMERS: 'customers',
  PAYMENT_REQUESTS: 'payment_requests',
  PAYMENT_REQUEST_ITEMS: 'payment_request_items',
  DISBURSEMENT_ORDERS: 'disbursement_orders',
  // RECEIPT_ORDERS: 'receipt_orders',  // 表尚未建立
  QUOTES: 'quotes',
  TODOS: 'todos',
  SUPPLIERS: 'suppliers',
  COST_TEMPLATES: 'cost_templates',
  SUPPLIER_CATEGORIES: 'supplier_categories',
  // 企業客戶系統
  COMPANIES: 'companies',
  COMPANY_CONTACTS: 'company_contacts',
  // 地區管理系統（三層架構）
  COUNTRIES: 'countries',
  REGIONS: 'regions',
  CITIES: 'cities',
  CALENDAR_EVENTS: 'calendar_events',
  // Workspace 相關
  WORKSPACES: 'workspaces',
  BULLETINS: 'bulletins',
  RICH_DOCUMENTS: 'rich_documents',
  ATTRACTIONS: 'attractions',
  RECEIPTS: 'receipts',
  VENDOR_COSTS: 'vendor_costs',
  // 會計系統
  JOURNAL_VOUCHERS: 'journal_vouchers',
  JOURNAL_LINES: 'journal_lines',
} as const

export type TableName = (typeof TABLES)[keyof typeof TABLES]
