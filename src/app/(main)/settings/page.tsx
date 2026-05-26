import { redirect } from 'next/navigation'

// /settings 入口導向 /settings/company（5/26：個人設定已改走側邊欄底部「扳手」dialog、不再有個人設定頁）
// /settings/company 自身有 settings.company.read 守門、無權限者會被導到 unauthorized
export default function SettingsIndexPage() {
  redirect('/settings/company')
}
