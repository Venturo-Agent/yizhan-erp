/**
 * 資料庫型別快捷匯出（按業務領域分組）
 *
 * 這份檔案不能手改 — 它是 src/lib/supabase/types.ts 的語意薄包裝。
 * 要新增欄位或表格請跑 `supabase gen types` 重新產生 types.ts，
 * 然後在這裡加上對應的 export alias。
 *
 * 用法：
 *   import type { OrderRow, TourRow } from '@/types/database'
 *
 * 不要改：
 *   src/lib/supabase/types.ts（auto-generated、會被覆蓋）
 */

import type { Database } from '@/lib/supabase/types'

// ─── 通用型別輔助工具 ─────────────────────────────────────────

type Tables = Database['public']['Tables']
type Enums = Database['public']['Enums']
type Views = Database['public']['Views']

/** 取得任一表的 Row 型別 */
export type Row<T extends keyof Tables> = Tables[T]['Row']

/** 取得任一表的 Insert 型別 */
export type Insert<T extends keyof Tables> = Tables[T]['Insert']

/** 取得任一表的 Update 型別 */
export type Update<T extends keyof Tables> = Tables[T]['Update']

/** 取得任一 Enum 型別 */
export type Enum<T extends keyof Enums> = Enums[T]

// ─── 訂單（Orders） ────────────────────────────────────────────

export type OrderRow = Tables['orders']['Row']
export type OrderInsert = Tables['orders']['Insert']
export type OrderUpdate = Tables['orders']['Update']

export type OrderMemberRow = Tables['order_members']['Row']
export type OrderMemberInsert = Tables['order_members']['Insert']
export type OrderMemberUpdate = Tables['order_members']['Update']

// ─── 行程（Tours） ────────────────────────────────────────────

export type TourRow = Tables['tours']['Row']
export type TourInsert = Tables['tours']['Insert']
export type TourUpdate = Tables['tours']['Update']

export type ItineraryRow = Tables['itineraries']['Row']
export type ItineraryInsert = Tables['itineraries']['Insert']
export type ItineraryUpdate = Tables['itineraries']['Update']

export type TourItineraryItemRow = Tables['tour_itinerary_items']['Row']
export type TourItineraryItemInsert = Tables['tour_itinerary_items']['Insert']
export type TourItineraryItemUpdate = Tables['tour_itinerary_items']['Update']

export type TourDocumentRow = Tables['tour_documents']['Row']
export type TourDocumentInsert = Tables['tour_documents']['Insert']
export type TourDocumentUpdate = Tables['tour_documents']['Update']

export type TourDestinationRow = Tables['tour_destinations']['Row']
export type TourDepartureDataRow = Tables['tour_departure_data']['Row']
export type TourBonusSettingRow = Tables['tour_bonus_settings']['Row']
export type TourCustomCostFieldRow = Tables['tour_custom_cost_fields']['Row']
export type TourMealSettingRow = Tables['tour_meal_settings']['Row']
export type TourMemberFieldRow = Tables['tour_member_fields']['Row']
export type TourRoleAssignmentRow = Tables['tour_role_assignments']['Row']

// ─── 客戶（Customers） ────────────────────────────────────────

export type CustomerRow = Tables['customers']['Row']
export type CustomerInsert = Tables['customers']['Insert']
export type CustomerUpdate = Tables['customers']['Update']

// ─── 報價（Quotes） ───────────────────────────────────────────

export type QuoteRow = Tables['quotes']['Row']
export type QuoteInsert = Tables['quotes']['Insert']
export type QuoteUpdate = Tables['quotes']['Update']

// export type QuoteConfirmationLogRow = Tables['quote_confirmation_logs']['Row']  // 表已移除

// ─── 財務 — 收款（Receipts） ──────────────────────────────────

export type ReceiptRow = Tables['receipts']['Row']
export type ReceiptInsert = Tables['receipts']['Insert']
export type ReceiptUpdate = Tables['receipts']['Update']

// ─── 財務 — 請款（Payment Requests） ─────────────────────────

export type PaymentRequestRow = Tables['payment_requests']['Row']
export type PaymentRequestInsert = Tables['payment_requests']['Insert']
export type PaymentRequestUpdate = Tables['payment_requests']['Update']

export type PaymentRequestItemRow = Tables['payment_request_items']['Row']
export type PaymentRequestItemInsert = Tables['payment_request_items']['Insert']
export type PaymentRequestItemUpdate = Tables['payment_request_items']['Update']

// ─── 財務 — 出納（Disbursement Orders） ──────────────────────

export type DisbursementOrderRow = Tables['disbursement_orders']['Row']
export type DisbursementOrderInsert = Tables['disbursement_orders']['Insert']
export type DisbursementOrderUpdate = Tables['disbursement_orders']['Update']

// ─── 財務 — 支票（Checks） ────────────────────────────────────

export type CheckRow = Tables['checks']['Row']
export type CheckInsert = Tables['checks']['Insert']
export type CheckUpdate = Tables['checks']['Update']

// ─── 財務 — 銀行帳號（Bank Accounts） ────────────────────────

export type BankAccountRow = Tables['bank_accounts']['Row']
export type BankAccountInsert = Tables['bank_accounts']['Insert']
export type BankAccountUpdate = Tables['bank_accounts']['Update']

// ─── 財務 — 會計（Accounting） ───────────────────────────────

export type JournalVoucherRow = Tables['journal_vouchers']['Row']
export type JournalVoucherInsert = Tables['journal_vouchers']['Insert']
export type JournalVoucherUpdate = Tables['journal_vouchers']['Update']

export type JournalLineRow = Tables['journal_lines']['Row']
export type JournalLineInsert = Tables['journal_lines']['Insert']
export type JournalLineUpdate = Tables['journal_lines']['Update']

export type ChartOfAccountRow = Tables['chart_of_accounts']['Row']
export type ChartOfAccountInsert = Tables['chart_of_accounts']['Insert']
export type ChartOfAccountUpdate = Tables['chart_of_accounts']['Update']

export type AccountingPeriodClosingRow = Tables['accounting_period_closings']['Row']
export type PaymentMethodRow = Tables['payment_methods']['Row']
export type ExpenseCategoryRow = Tables['expense_categories']['Row']

// ─── 供應商（Suppliers） ──────────────────────────────────────

export type SupplierRow = Tables['suppliers']['Row']
export type SupplierInsert = Tables['suppliers']['Insert']
export type SupplierUpdate = Tables['suppliers']['Update']

export type SupplierCategoryRow = Tables['supplier_categories']['Row']
// vendor_costs 表已移除
// export type VendorCostRow = Tables['vendor_costs']['Row']
// export type VendorCostInsert = Tables['vendor_costs']['Insert']
// export type VendorCostUpdate = Tables['vendor_costs']['Update']

// ─── 費用模板（Cost Templates） ───────────────────────────────

// export type CostTemplateRow = Tables['cost_templates']['Row']  // 表已移除
// export type CostTemplateInsert = Tables['cost_templates']['Insert']  // 表已移除
// export type CostTemplateUpdate = Tables['cost_templates']['Update']  // 表已移除

// ─── 人資（HR） ───────────────────────────────────────────────

export type EmployeeRow = Tables['employees']['Row']
export type EmployeeInsert = Tables['employees']['Insert']
export type EmployeeUpdate = Tables['employees']['Update']

export type EmployeeEligibilityRow = Tables['employee_eligibilities']['Row']

// 請假
// export type LeaveRequestRow = Tables['leave_requests']['Row']  // 表已移除
// export type LeaveRequestInsert = Tables['leave_requests']['Insert']  // 表已移除
// export type LeaveRequestUpdate = Tables['leave_requests']['Update']  // 表已移除

// export type LeaveBalanceRow = Tables['leave_balances']['Row']  // 表已移除
// export type LeaveTypeRow = Tables['leave_types']['Row']  // 表已移除

// 打卡
// export type ClockRecordRow = Tables['clock_records']['Row']  // 表已移除
// export type ClockRecordInsert = Tables['clock_records']['Insert']  // 表已移除
// export type ClockRecordUpdate = Tables['clock_records']['Update']  // 表已移除

// export type MissedClockRequestRow = Tables['missed_clock_requests']['Row']  // 表已移除
// export type OvertimeRequestRow = Tables['overtime_requests']['Row']  // 表已移除

// 薪資
// export type PayrollRunRow = Tables['payroll_runs']['Row']  // 表已移除
// export type PayslipRow = Tables['payslips']['Row']  // 表已移除

// ─── 權限 / 角色（Permissions & Roles） ──────────────────────

export type WorkspaceRoleRow = Tables['workspace_roles']['Row']
export type WorkspaceRoleInsert = Tables['workspace_roles']['Insert']
export type WorkspaceRoleUpdate = Tables['workspace_roles']['Update']

export type RoleCapabilityRow = Tables['role_capabilities']['Row']
export type RoleCapabilityInsert = Tables['role_capabilities']['Insert']
export type RoleCapabilityUpdate = Tables['role_capabilities']['Update']

export type SelectorFieldRoleRow = Tables['selector_field_roles']['Row']

// ─── 工作區（Workspaces） ─────────────────────────────────────

export type WorkspaceRow = Tables['workspaces']['Row']
export type WorkspaceInsert = Tables['workspaces']['Insert']
export type WorkspaceUpdate = Tables['workspaces']['Update']

export type WorkspaceFeatureRow = Tables['workspace_features']['Row']
export type WorkspaceFeatureInsert = Tables['workspace_features']['Insert']
export type WorkspaceFeatureUpdate = Tables['workspace_features']['Update']

// export type WorkspaceAttendanceSettingRow = Tables['workspace_attendance_settings']['Row']  // 表已移除
export type WorkspaceBonusDefaultRow = Tables['workspace_bonus_defaults']['Row']
export type WorkspaceCountryRow = Tables['workspace_countries']['Row']
export type WorkspaceAiSettingRow = Tables['workspace_ai_settings']['Row']
export type WorkspaceBillingRecordRow = Tables['workspace_billing_records']['Row']
export type WorkspaceFacebookSettingRow = Tables['workspace_facebook_settings']['Row']
export type WorkspaceLineSettingRow = Tables['workspace_line_settings']['Row']
export type WorkspaceSelectorFieldRow = Tables['workspace_selector_fields']['Row']

// ─── 使用者 / 個人設定（Profiles） ───────────────────────────

// export type ProfileRow = Tables['profiles']['Row']  // 表已移除
// export type ProfileInsert = Tables['profiles']['Insert']  // 表已移除
// export type ProfileUpdate = Tables['profiles']['Update']  // 表已移除

export type UserPreferenceRow = Tables['user_preferences']['Row']
export type UserPreferenceInsert = Tables['user_preferences']['Insert']
export type UserPreferenceUpdate = Tables['user_preferences']['Update']

// ─── 公司與聯絡人（Companies & Contacts） ────────────────────

export type CompanyRow = Tables['companies']['Row']
export type CompanyInsert = Tables['companies']['Insert']
export type CompanyUpdate = Tables['companies']['Update']

export type CompanyContactRow = Tables['company_contacts']['Row']
export type CompanyContactInsert = Tables['company_contacts']['Insert']
export type CompanyContactUpdate = Tables['company_contacts']['Update']

export type ContractRow = Tables['contracts']['Row']

// ─── 目的地 / 地理（Geography） ──────────────────────────────

export type CityRow = Tables['cities']['Row']
export type CountryRow = Tables['countries']['Row']
export type RegionRow = Tables['regions']['Row']

export type RefAirlineRow = Tables['ref_airlines']['Row']
export type RefAirportRow = Tables['ref_airports']['Row']
export type RefBookingClassRow = Tables['ref_booking_classes']['Row']
// export type RefCityRow = Tables['ref_cities']['Row']  // 表已移除
export type RefCountryRow = Tables['ref_countries']['Row']
export type RefDestinationRow = Tables['ref_destinations']['Row']
export type RefSsrCodeRow = Tables['ref_ssr_codes']['Row']
export type RefStatusCodeRow = Tables['ref_status_codes']['Row']

// ─── 飯店 / 餐廳 / 景點（Accommodations & Attractions） ──────

export type HotelRow = Tables['hotels']['Row']
export type HotelInsert = Tables['hotels']['Insert']
export type HotelUpdate = Tables['hotels']['Update']

export type RestaurantRow = Tables['restaurants']['Row']
export type RestaurantInsert = Tables['restaurants']['Insert']
export type RestaurantUpdate = Tables['restaurants']['Update']

export type AttractionRow = Tables['attractions']['Row']
export type AttractionInsert = Tables['attractions']['Insert']
export type AttractionUpdate = Tables['attractions']['Update']

// export type PremiumExperienceRow = Tables['premium_experiences']['Row']  // 表已移除
export type AirportImageRow = Tables['airport_images']['Row']

// ─── PNR / 航班（PNR & Flights） ─────────────────────────────

// export type PnrRecordRow = Tables['pnr_records']['Row']  // 表已移除
// export type PnrRecordInsert = Tables['pnr_records']['Insert']  // 表已移除
// export type PnrRecordUpdate = Tables['pnr_records']['Update']  // 表已移除

// export type FlightStatusSubscriptionRow = Tables['flight_status_subscriptions']['Row']  // 表已移除

// ─── 通訊（LINE / Bulletins） ─────────────────────────────────

export type LineConversationMessageRow = Tables['line_conversation_messages']['Row']
export type LineConversationMessageInsert = Tables['line_conversation_messages']['Insert']
export type LineConversationMessageUpdate = Tables['line_conversation_messages']['Update']

// export type BulletinRow = Tables['bulletins']['Row']  // 表已移除
// export type BulletinInsert = Tables['bulletins']['Insert']  // 表已移除
// export type BulletinUpdate = Tables['bulletins']['Update']  // 表已移除

// ─── 行事曆 / 任務（Calendar & Tasks） ───────────────────────

export type CalendarEventRow = Tables['calendar_events']['Row']
export type CalendarEventInsert = Tables['calendar_events']['Insert']
export type CalendarEventUpdate = Tables['calendar_events']['Update']

// tasks 表已移除
// export type TaskRow = Tables['tasks']['Row']
// export type TaskInsert = Tables['tasks']['Insert']
// export type TaskUpdate = Tables['tasks']['Update']

// ─── 待辦（Todos） ───────────────────────────────────────────

export type TodoRow = Tables['todos']['Row']
export type TodoInsert = Tables['todos']['Insert']
export type TodoUpdate = Tables['todos']['Update']

export type TodoColumnRow = Tables['todo_columns']['Row']

// ─── 筆記 / 文件（Notes & Documents） ───────────────────────

export type NoteRow = Tables['notes']['Row']
export type NoteInsert = Tables['notes']['Insert']
export type NoteUpdate = Tables['notes']['Update']

// rich_documents 表已移除
// export type RichDocumentRow = Tables['rich_documents']['Row']
// export type RichDocumentInsert = Tables['rich_documents']['Insert']
// export type RichDocumentUpdate = Tables['rich_documents']['Update']

// ─── 圖片庫（Image Library） ──────────────────────────────────

export type ImageLibraryRow = Tables['image_library']['Row']
export type ImageLibraryInsert = Tables['image_library']['Insert']
export type ImageLibraryUpdate = Tables['image_library']['Update']

// ─── 審計 / 系統日誌（Audit & System Logs） ──────────────────

export type AuditLogRow = Tables['audit_logs']['Row']
export type BackgroundTaskRow = Tables['background_tasks']['Row']
export type ApiUsageRow = Tables['api_usage']['Row']
export type CronExecutionLogRow = Tables['cron_execution_logs']['Row']
// export type RateLimitRow = Tables['rate_limits']['Row']  // 表已移除
export type WebhookIdempotencyKeyRow = Tables['webhook_idempotency_keys']['Row']

// ─── AI（AI Agents） ──────────────────────────────────────────

export type AiAgentRow = Tables['ai_agents']['Row']
export type AiAgentInsert = Tables['ai_agents']['Insert']
export type AiAgentUpdate = Tables['ai_agents']['Update']

// ─── 選項欄位（Selector Fields） ─────────────────────────────

export type WorkspaceSelectorFieldInsert = Tables['workspace_selector_fields']['Insert']
export type WorkspaceSelectorFieldUpdate = Tables['workspace_selector_fields']['Update']

// ─── Views ────────────────────────────────────────────────────

// export type AttendanceDailyView = Views['v_attendance_daily']['Row']  // view 已移除

// ─── Enums ────────────────────────────────────────────────────

// 以下 enum 已從 DB 移除
// export type AccountingEventStatus = Enums['accounting_event_status']
// export type AccountingEventType = Enums['accounting_event_type']
// export type CalendarVisibility = Enums['calendar_visibility']
// export type ChannelVisibility = Enums['channel_visibility']
// export type ConfirmationType = Enums['confirmation_type']
export type FileAction = Enums['file_action']
export type FileCategory = Enums['file_category']
export type FolderType = Enums['folder_type']
export type SubledgerType = Enums['subledger_type']
export type TaskPriority = Enums['task_priority']
export type TaskStatus = Enums['task_status']
export type VerificationStatus = Enums['verification_status']
export type VoucherStatus = Enums['voucher_status']
