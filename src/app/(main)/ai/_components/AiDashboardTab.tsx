'use client'

/**
 * AI Hub - Dashboard tab（客戶看自己 workspace 的 AI 表現）
 *
 * 2026-05-19 William 拍板：用同一個 AiHealthDashboard component、
 * 切 audience='customer'、call /api/ai/health 自己 scope。
 *
 * 跟租戶管理「AI 健康度」tab 完全同步演進（一份 code 兩個受眾、文案微調）。
 */

import { AiHealthDashboard } from '@/app/(main)/workspaces/[id]/_components/ai-health-tab'

export function AiDashboardTab() {
  return <AiHealthDashboard apiUrl="/api/ai/health" audience="customer" fluid />
}
