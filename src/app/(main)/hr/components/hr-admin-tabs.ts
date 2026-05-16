/**
 * 人資管理 module 內分頁定義
 * 給 ResponsiveHeader 的 tabs prop 用：value 是路由路徑，click 時用 router.push 切換
 *
 * HR 只留「員工列表 + 職務管理」、其他全砍。
 */

interface HrTab {
  value: string // 路由路徑
  label: string
}

export const HR_ADMIN_TABS: Record<string, HrTab[]> = {
  employee: [
    { value: '/hr', label: '員工列表' },
    { value: '/hr/roles', label: '職務管理' },
  ],
}
