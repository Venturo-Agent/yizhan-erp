/**
 * RBAC 型別定義
 *
 * ⚠️ 權限判斷請用 role_tab_permissions + module:tab 格式（workspace_roles 表）。
 * 本檔僅提供 UserRole type 給 employees.roles 欄位做型別標註，不參與權限判斷。
 */

/** employees.roles 欄位用的型別 */
export type UserRole = 'admin' | 'sales' | 'accountant' | 'assistant' | 'staff' | 'bot'
