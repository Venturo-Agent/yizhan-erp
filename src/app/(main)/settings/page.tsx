import { redirect } from 'next/navigation'

// /settings 入口統一導向 /settings/personal、讓路由結構跟「個人設定 / 公司設定」對齊
export default function SettingsIndexPage() {
  redirect('/settings/personal')
}
