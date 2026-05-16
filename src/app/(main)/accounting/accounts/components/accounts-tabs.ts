/**
 * 會計科目模組分頁定義
 * 期初餘額不再獨立 sidebar 入口、整合進「科目管理」變第二分頁
 */

interface AccountsTab {
  value: string // 路由路徑
  label: string
}

export const ACCOUNTS_TABS: AccountsTab[] = [
  { value: '/accounting/accounts', label: '科目列表' },
  { value: '/accounting/opening-balances', label: '期初餘額' },
]
