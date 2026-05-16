import { redirect } from 'next/navigation'

/**
 * /platform 入口頁 — 直接 redirect 到第一個整合（AiToEarn）
 *
 * 之後加新平台整合（譬如 xhs / capture-bot）時、改成 landing 頁列出所有整合
 */
export default function PlatformIndexPage() {
  redirect('/platform/aitoearn')
}
