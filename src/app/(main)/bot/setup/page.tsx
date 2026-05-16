import { redirect } from 'next/navigation'

/**
 * /bot/setup — 已遷移到 /ai?tab=setup&channel=line
 *
 * 5/14 William 拍板：/bot 全整合進 AI Hub。LINE setup wizard 移到
 * src/app/(main)/ai/_components/setup/LineSetup.tsx。
 *
 * 鐵律 #8：保留檔案、不 rm。
 */
export default function BotSetupRedirectPage() {
  redirect('/ai?tab=setup&channel=line')
}
