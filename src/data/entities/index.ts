/**
 * Entities Export
 *
 * 所有 entity hooks 統一從這裡 export
 */

// ============================================
// 核心業務
// ============================================

// Tours
export {
  
  useTours,
  useToursSlim,
  useTour,
  
  useTourDictionary,
  useToursForCalendar,
  fetchTourIdByCode,
  createTour,
  updateTour,
  deleteTour,
  invalidateTours,
} from './tours'

// Orders
export {
  useOrders,
  useOrdersSlim,
  useOrdersPaginated,
  createOrder,
  updateOrder,
  deleteOrder,
  invalidateOrders,
} from './orders'

// Members
export {

  useMembers,
  useMembersSlim,





  deleteMember,

} from './members'

// Order Members (5/19 補、原 125 處散刻 supabase.from('order_members'))
export {
  useOrderMembers,
  useOrderMember,
  createOrderMember,
  updateOrderMember,
  deleteOrderMember,
  invalidateOrderMembers,
} from './order-members'

// Customers
export {
  useCustomers,
  useCustomersSlim,
  useCustomersPaginated,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  invalidateCustomers,
} from './customers'

// ============================================
// 提案與報價
// ============================================

// Quotes
export {
  useQuotes,
  useQuotesSlim,
  useQuote,
  createQuote,
  updateQuote,
  deleteQuote,
  invalidateQuotes,
} from './quotes'

// Itineraries
export {
  useItineraries,
  createItinerary,
  updateItinerary,
  invalidateItineraries,
} from './itineraries'

// ============================================
// 財務管理
// ============================================

// Payment Requests
export {
  
  usePaymentRequests,
  
  
  
  
  createPaymentRequest,
  updatePaymentRequest,
  deletePaymentRequest,
  invalidatePaymentRequests,
} from './payment-requests'

// Receipts (收款)
export {
  
  useReceipts,
  
  
  
  
  createReceipt,
  updateReceipt,
  deleteReceipt,
  invalidateReceipts,
} from './receipts'

// Disbursement Orders
export {
  
  useDisbursementOrders,
  
  
  
  
  
  updateDisbursementOrder,
  deleteDisbursementOrder,
  invalidateDisbursementOrders,
} from './disbursement-orders'

// Accounting Subjects 已整併至 chart_of_accounts

// Workspace Modules


// ============================================
// 人員管理
// ============================================

// Employees
export {
  useEmployees,
  useEmployeesSlim,
  useEmployee,
  useEmployeesPaginated,
  useEmployeeDictionary,
} from './employees'

// ============================================
// 業務支援
// ============================================

// Visas 模組整個移除

// Suppliers
export {
  
  useSuppliers,
  useSuppliersSlim,
  
  
  
  createSupplier,
  updateSupplier,
  deleteSupplier,
  invalidateSuppliers,
} from './suppliers'

// Airport Images
export {
  
  useAirportImages,
  
  
  
  
  createAirportImage,
  
  deleteAirportImage,
  
} from './airport-images'

// ============================================
// 地理資料
// ============================================

// Countries
export {
  
  useCountries,
  
  
  
  
  
  updateCountry,
  
  invalidateCountries,
} from './countries'


// Regions
export {
  
  useRegions,
  
  
  
  
  
  
  
  
} from './regions'

// Cities
export {
  
  useCities,
  
  
  
  
  
  updateCity,
  
  
} from './cities'


// Attractions
export {
  
  useAttractions,
  
  
  
  
  createAttraction,
  updateAttraction,
  deleteAttraction,
  invalidateAttractions,
} from './attractions'

// Hotels
export {
  
  useHotels,
  
  
  createHotel,
  updateHotel,
  deleteHotel,
  invalidateHotels,
} from './hotels'

// Restaurants
export {
  
  useRestaurants,
  
  
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  invalidateRestaurants,
} from './restaurants'

// ============================================
// 行事曆與加購
// ============================================

// Calendar Events
export {
  
  useCalendarEvents,
  
  
  
  
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  invalidateCalendarEvents,
} from './calendar-events'

// ============================================
// vendor-costs entity wrapper 整檔砍（knip 0 caller）
// DB 表保留（紅線 #0）。未來若要重啟、重寫 hook
// ============================================

// Payment Request Items
export {
  usePaymentRequestItems,
  createPaymentRequestItem,
  invalidatePaymentRequestItems,
} from './payment-request-items'

// ============================================
// 成本模板
// ============================================

// Cost Templates


// ============================================
// 供應商類別
// ============================================

// Supplier Categories


// ============================================
// Notes
export * from './notes'

// ============================================
// Ref Master Tables（ref_banks / ref_countries / ref_airports）
// 5/19 SWR 健檢曾規劃補 entity、但這些表 PK 非 id（bank_code / code / iata_code）、
// createEntityHook 寫死 .eq('id', ...)、不支援自訂 PK；底層擴展是另一個工程。
// 暫時保留 caller（bank-combobox / shared-data/*）直接用 useSWR、加 eslint-disable
// + comment 註明理由。未來擴展 createEntityHook 支援 pkColumn 再回頭補。
// ============================================

// ============================================
// Chart of Accounts（會計科目、5/19 補）
// ============================================
export {
  useChartOfAccounts,
  useChartOfAccount,
  createChartOfAccount,
  updateChartOfAccount,
  deleteChartOfAccount,
  invalidateChartOfAccounts,
} from './chart-of-accounts'

// Image Library
export * from './image-library'

// Tour Bonus Settings
export * from './tour-bonus-settings'

// Workspace Bonus Defaults
export * from './workspace-bonus-defaults'

// Workspaces
export * from './workspaces'

// ============================================
// 核心表（行程項目生命週期）
// ============================================

// Tour Itinerary Items
export {
  
  useTourItineraryItems,
  
  
  
  
  
  
  
  invalidateTourItineraryItems,
} from './tour-itinerary-items'

// Tour Itinerary Days — 已合併進 tour_itinerary_items（category='day_meta' anchor row）
// 見 migration 20260502120000_merge_tour_itinerary_days_into_items.sql

// ============================================
// CIS 工作流（2026-05-19 砍除、保留 finance-summary export）
// ============================================

export { useTourPL, useTreasurySummary } from './finance-summary'

// ============================================
// 文件中心（Phase 1）
// ============================================

// Workspace Documents
export {
  useWorkspaceDocuments,
  useWorkspaceDocumentsSlim,
  useWorkspaceDocument,
  createWorkspaceDocument,
  updateWorkspaceDocument,
  deleteWorkspaceDocument,
  invalidateWorkspaceDocuments,
} from './workspace-documents'
export type { WorkspaceDocument } from './workspace-documents'

// Workspace Seals（章印管理）
export {
  useWorkspaceSeals,
  useWorkspaceSealsSlim,
  useWorkspaceSeal,
  createWorkspaceSeal,
  updateWorkspaceSeal,
  deleteWorkspaceSeal,
  invalidateWorkspaceSeals,
} from './workspace-seals'
export type { WorkspaceSeal } from './workspace-seals'
export type { TourPL, TreasurySummary } from './finance-summary'

// Channels
export {
  useChannels,
  useChannel,
  createChannel,
  updateChannel,
  deleteChannel,
  invalidateChannels,
} from './channels'

export {
  useChannelMembers,
  createChannelMember,
  updateChannelMember,
  deleteChannelMember,
  invalidateChannelMembers,
} from './channel-members'

export {
  useChannelMessages,
  createChannelMessage,
  updateChannelMessage,
  deleteChannelMessage,
  invalidateChannelMessages,
} from './channel-messages'

// AI Agents（HAPPY 等、與 employees 表分離）
export {
  useAiAgents,
  useAiAgentsSlim,
  useAiAgent,
  invalidateAiAgents,
} from './ai-agents'

// ============================================
// 電子收據（Travel Invoice）
// ============================================
export {
  useTravelInvoices,
  useTravelInvoicesSlim,
  useTravelInvoice,
  createTravelInvoice,
  updateTravelInvoice,
  deleteTravelInvoice,
  invalidateTravelInvoices,
} from './travel-invoices'
export type { TravelInvoice } from './travel-invoices'

// ============================================
// eSIM 管理（Worldmove）
// ============================================
export {
  useWorldmoveOrders,
  useWorldmoveOrdersSlim,
  useWorldmoveOrder,
  createWorldmoveOrder,
  updateWorldmoveOrder,
  deleteWorldmoveOrder,
  invalidateWorldmoveOrders,
} from './worldmove-orders'
export type { WorldmoveOrder } from './worldmove-orders'

export {
  useWorldmoveEsimItems,
  useWorldmoveEsimItemsSlim,
  useWorldmoveEsimItem,
  createWorldmoveEsimItem,
  updateWorldmoveEsimItem,
  deleteWorldmoveEsimItem,
  invalidateWorldmoveEsimItems,
} from './worldmove-esim-items'
export type { WorldmoveEsimItem } from './worldmove-esim-items'

// Customer Document Applications（Round 10、簽證代辦）
export {
  useCustomerDocumentApplications,
  useCustomerDocumentApplication,
  createCustomerDocumentApplication,
  updateCustomerDocumentApplication,
  deleteCustomerDocumentApplication,
  invalidateCustomerDocumentApplications,
} from './customer-document-applications'
export type { CustomerDocumentApplication } from './customer-document-applications'

// Document Types（Round 10、簽證代辦字典）
export {
  useDocumentTypes,
  useDocumentType,
  useDocumentTypesSlim,
  invalidateDocumentTypes,
} from './document-types'
export type { DocumentType } from './document-types'

// Application Service Types（Round 10、簽證代辦服務類型）
export {
  useApplicationServiceTypes,
  useApplicationServiceType,
  useApplicationServiceTypesSlim,
  createApplicationServiceType,
  updateApplicationServiceType,
  deleteApplicationServiceType,
  invalidateApplicationServiceTypes,
} from './application-service-types'
export type { ApplicationServiceType } from './application-service-types'

// Customer Documents（Round 10、客戶證件檔）
export {
  useCustomerDocuments,
  useCustomerDocument,
  createCustomerDocument,
  updateCustomerDocument,
  deleteCustomerDocument,
  invalidateCustomerDocuments,
} from './customer-documents'
export type { CustomerDocument } from './customer-documents'

// Supplier Pricing（Round 10、代辦商報價）
export {
  useSupplierPricings,
  useSupplierPricing,
  createSupplierPricing,
  updateSupplierPricing,
  deleteSupplierPricing,
  invalidateSupplierPricings,
} from './supplier-pricing'
export type { SupplierPricing } from './supplier-pricing'

// 5/24 純角色 SSOT：移除 employee-eligibilities 系統（旗標已廢、改純角色能力）。

// Role Capabilities（5/24、純角色 SSOT、指派候選池來源）
export {
  useRoleCapabilities,
  invalidateRoleCapabilities,
} from './role-capabilities'
export type { RoleCapability } from './role-capabilities'

// ============================================
// 行銷管理（2026-05-20、Corner 官網行程上架）
// ============================================
export {
  useWebsiteTours,
  useWebsiteToursSlim,
  useWebsiteTourDetail,
  invalidateWebsiteTours,
} from './website-tours'

// ============================================
// 財務設定（2026-05-21、補紅線 H 修法配套）
// ============================================

// Payment Methods（付款方式）
export {
  usePaymentMethods,
  usePaymentMethod,
  invalidatePaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from './payment-methods'
export type { PaymentMethod } from './payment-methods'

// Bank Accounts（銀行帳戶）
export {
  useBankAccounts,
  useBankAccount,
  invalidateBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
} from './bank-accounts'
export type { BankAccount } from './bank-accounts'

// Expense Categories（請款類別、含團體 + 公司）
export {
  useExpenseCategories,
  useExpenseCategory,
  invalidateExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
} from './expense-categories'
export type { ExpenseCategory } from './expense-categories'

// Contracts（旅遊合約 / 電子簽約）
export {
  useContracts,
  useContract,
  invalidateContracts,
} from './contracts'
export type { Contract } from './contracts'
