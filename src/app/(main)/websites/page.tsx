import { redirect } from 'next/navigation'

/**
 * /websites — entry、自動轉到 /websites/design
 *
 * 為什麼預設 design 不是 products：
 *   客戶買加購最常做的事 = 看 / 改自己官網長相、所以開門先到 design。
 */
export default function WebsitesIndexPage() {
  redirect('/websites/design')
}
