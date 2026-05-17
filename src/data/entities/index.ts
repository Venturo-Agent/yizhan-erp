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
// CIS 工作流（漫途整合行銷專屬）
// ============================================

// CIS Clients
export {
  useCisClients,
  useCisClientsSlim,
  useCisClient,
  useCisClientsPaginated,
  useCisClientDictionary,
  createCisClient,
  updateCisClient,
  deleteCisClient,
  invalidateCisClients,
} from './cis-clients'

// CIS Visits
export {
  useCisVisits,
  useCisVisit,
  useCisVisitsPaginated,
  createCisVisit,
  updateCisVisit,
  deleteCisVisit,
  invalidateCisVisits,
} from './cis-visits'

// CIS Pricing Items
export {
  useCisPricingItems,
  useCisPricingItemsSlim,
  useCisPricingItem,
  useCisPricingItemsPaginated,
  createCisPricingItem,
  updateCisPricingItem,
  deleteCisPricingItem,
  invalidateCisPricingItems,
} from './cis-pricing-items'

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

// Employee Eligibilities（5/13、員工資格、從 role_capabilities 移過來）
export {
  useEmployeeEligibilities,
  invalidateEmployeeEligibilities,
} from './employee-eligibilities'
export type { EmployeeEligibility } from './employee-eligibilities'
