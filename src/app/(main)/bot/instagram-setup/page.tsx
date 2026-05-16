import { redirect } from 'next/navigation'

/**
 * /bot/instagram-setup — 已遷移到 /ai?tab=setup&channel=instagram
 *
 * 5/14 William 拍板：/bot 全整合進 AI Hub。IG setup wizard 移到
 * src/app/(main)/ai/_components/setup/InstagramSetup.tsx。
 *
 * 鐵律 #8：保留檔案、不 rm。
 */
export default function InstagramSetupRedirectPage() {
  redirect('/ai?tab=setup&channel=instagram')
}
