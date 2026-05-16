import { redirect } from 'next/navigation'

/**
 * /bot/facebook-setup — 已遷移到 /ai?tab=setup&channel=facebook
 *
 * 5/14 William 拍板：/bot 全整合進 AI Hub。FB setup wizard 移到
 * src/app/(main)/ai/_components/setup/FacebookSetup.tsx。
 *
 * 鐵律 #8：保留檔案、不 rm。
 */
export default function FacebookSetupRedirectPage() {
  redirect('/ai?tab=setup&channel=facebook')
}
