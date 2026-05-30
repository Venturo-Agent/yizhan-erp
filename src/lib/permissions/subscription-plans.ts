/**
 * 完整人資（hr_full）判定
 *
 * William 2026-05-30：「輕量/標準/進階/旗艦」版本套餐已整團拆除（含 DB
 * workspaces.subscription_plan 欄位）、改純功能開關。本檔僅保留「完整人資」
 * 判定（HR_FULL_FEATURES / isHrFullEnabled）：員工表單用、與版本套餐無關。
 */

/**
 * 「完整人資」對應的 feature code 集合（薪資結算 + 獎金結算）
 * SSOT：給「員工 form 是否顯示薪資 / 銀行 / 到職日等進階欄位」判定用、避免散刻
 */
export const HR_FULL_FEATURES: readonly string[] = ['hr_salary_settlement', 'hr_bonus_settlement']

/**
 * 判定某 workspace 是否啟用「完整人資」(hr_full)
 * = HR_FULL_FEATURES 全部都開
 *
 * @param check 給定 feature_code 判定是否啟用的函數（譬如 useWorkspaceFeatures.isFeatureEnabled）
 */
export function isHrFullEnabled(check: (featureCode: string) => boolean): boolean {
  return HR_FULL_FEATURES.every(code => check(code))
}
