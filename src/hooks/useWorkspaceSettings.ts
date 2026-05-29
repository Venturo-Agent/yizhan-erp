'use client'

import type React from 'react'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import { mutate } from '@/lib/swr/scoped-mutate'
import { useAuthStore } from '@/stores/auth-store'

interface WorkspaceSettings {
  name: string
  phone: string
  address: string
  legal_name: string
  subtitle: string
  logo_url: string
  fax: string
  email: string
  website: string
  tax_id: string
  company_seal_url: string
  personal_seal_url: string
  invoice_seal_image_url: string
  // Logo 列印頁首位置設定(公司設定頁可拖滑桿微調)
  logo_scale: number
  logo_offset_x: number
  logo_offset_y: number
}

const EMPTY_SETTINGS: WorkspaceSettings = {
  name: '',
  phone: '',
  address: '',
  legal_name: '',
  subtitle: '',
  logo_url: '',
  fax: '',
  email: '',
  website: '',
  tax_id: '',
  company_seal_url: '',
  personal_seal_url: '',
  invoice_seal_image_url: '',
  logo_scale: 1.0,
  logo_offset_x: 0,
  logo_offset_y: 0,
}

const SELECT_FIELDS =
  'name, phone, address, legal_name, subtitle, logo_url, fax, email, website, tax_id, company_seal_url, personal_seal_url, invoice_seal_image_url, logo_scale, logo_offset_x, logo_offset_y' as const

// SWR cache key (給 invalidateWorkspaceSettings 用)
const SWR_KEY_PREFIX = 'workspace-settings'
function buildSwrKey(workspaceId: string): readonly [string, string] {
  return [SWR_KEY_PREFIX, workspaceId] as const
}

/**
 * Logo 規範
 * - 列印文件：max-width: 150px, max-height: 40px
 * - 網頁 Header：max-width: 120px, max-height: 36px
 */
const LOGO_CONSTRAINTS = {
  print: { maxWidth: 150, maxHeight: 40 },
  header: { maxWidth: 120, maxHeight: 36 },
} as const

/**
 * 取得 logo 樣式（根據用途）
 */
export function getLogoStyle(usage: 'print' | 'header' = 'print') {
  const constraints = LOGO_CONSTRAINTS[usage]
  return {
    maxWidth: `${constraints.maxWidth}px`,
    maxHeight: `${constraints.maxHeight}px`,
    width: 'auto',
    height: 'auto',
    objectFit: 'contain' as const,
  }
}

/**
 * 取得列印頁首 logo wrapper 樣式(套用公司設定的 scale + offsetX + offsetY)
 *
 * 用法:
 *   const ws = useWorkspaceSettings()
 *   <div style={getPrintLogoBoxStyle(ws)}>
 *     <img src={ws.logo_url} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
 *   </div>
 *
 * Base size 120×40(對齊 src/lib/print/PrintHeader.tsx)、scale 1.0 = 100%。
 */
export function getPrintLogoBoxStyle(
  ws: Pick<WorkspaceSettings, 'logo_scale' | 'logo_offset_x' | 'logo_offset_y'>
): React.CSSProperties {
  const scale = typeof ws.logo_scale === 'number' && ws.logo_scale > 0 ? ws.logo_scale : 1.0
  const offsetX = typeof ws.logo_offset_x === 'number' ? ws.logo_offset_x : 0
  const offsetY = typeof ws.logo_offset_y === 'number' ? ws.logo_offset_y : 0
  return {
    position: 'absolute',
    left: `${offsetX}px`,
    top: `${offsetY}px`,
    width: `${120 * scale}px`,
    height: `${40 * scale}px`,
  }
}

/**
 * 取得「正常流」logo box 樣式（吃 logo_scale + 可選位移 + 可選最大高度上限）。
 *
 * 跟 getPrintLogoBoxStyle（絕對定位版）的差別：這個保持正常流、用 transform 套位移、
 * 不會擠壓相鄰內容（如收據 logo 下方緊接的公司名）。base 120×40、scale 1.0 = 100%。
 *
 * - 列印文件（收據）：{ applyOffset: true }、不設 maxHeight（A4 容得下大倍率）
 * - 網頁 UI（付款頁 / 頁尾）：設 maxHeight 防列印用的大倍率撐爆版面；
 *   網頁多為置中 / flex 佈局、列印微調用的位移套上去會讓 logo 偏出容器、故預設不套位移
 */
export function getScaledLogoBoxStyle(
  ws: { logo_scale?: number | null; logo_offset_x?: number | null; logo_offset_y?: number | null },
  opts?: { maxHeight?: number; applyOffset?: boolean }
): React.CSSProperties {
  const BASE_W = 120
  const BASE_H = 40
  const scale = typeof ws.logo_scale === 'number' && ws.logo_scale > 0 ? ws.logo_scale : 1.0
  let width = BASE_W * scale
  let height = BASE_H * scale
  // 網頁場景：超過上限就等比例縮回（高度封頂、寬度跟著比例縮）
  if (opts?.maxHeight && height > opts.maxHeight) {
    width = width * (opts.maxHeight / height)
    height = opts.maxHeight
  }
  const style: React.CSSProperties = { width: `${width}px`, height: `${height}px` }
  if (opts?.applyOffset) {
    const offsetX = typeof ws.logo_offset_x === 'number' ? ws.logo_offset_x : 0
    const offsetY = typeof ws.logo_offset_y === 'number' ? ws.logo_offset_y : 0
    style.transform = `translate(${offsetX}px, ${offsetY}px)`
  }
  return style
}

/**
 * 取得目前 workspace 的公司設定（銀行資訊、電話、地址、logo 等）
 *
 * SWR cache 策略(2026-05-20 加):
 * - dedupingInterval: 30 min — 公司設定改動極稀疏(一個月一次)、不需要頻繁 refetch
 * - revalidateOnFocus: false — 切回 tab 不重撈、省 Supabase 流量
 * - 寫入後手動 call invalidateWorkspaceSettings(workspaceId) 失效 cache
 *
 * 為什麼 30 min 而不是 5 min(預設):公司設定一旦設好幾乎不變、列印流程一天觸發數十次、
 * 5 min TTL 意義不大、30 min 已經足夠覆蓋大部分使用情境、節省流量。
 */
export function useWorkspaceSettings(): WorkspaceSettings {
  const workspaceId = useAuthStore(state => state.user?.workspace_id)
  const { data } = useSWR<WorkspaceSettings>(
    workspaceId ? buildSwrKey(workspaceId) : null,
    async (key: readonly [string, string]) => {
      const wsId = key[1]
      const { data, error } = await supabase
        .from('workspaces')
        .select(SELECT_FIELDS)
        .eq('id', wsId)
        .single()
      if (error) throw error
      if (!data) return EMPTY_SETTINGS

      const rawScale = (data as Record<string, unknown>).logo_scale
      const rawOffsetX = (data as Record<string, unknown>).logo_offset_x
      const rawOffsetY = (data as Record<string, unknown>).logo_offset_y
      return {
        name: data.name ?? '',
        phone: data.phone ?? '',
        address: data.address ?? '',
        legal_name: data.legal_name ?? '',
        subtitle: data.subtitle ?? '',
        logo_url: data.logo_url ?? '',
        fax: data.fax ?? '',
        email: data.email ?? '',
        website: data.website ?? '',
        tax_id: data.tax_id ?? '',
        company_seal_url: data.company_seal_url ?? '',
        personal_seal_url: data.personal_seal_url ?? '',
        invoice_seal_image_url: data.invoice_seal_image_url ?? '',
        logo_scale:
          typeof rawScale === 'number'
            ? rawScale
            : rawScale != null
              ? Number(rawScale) || 1.0
              : 1.0,
        logo_offset_x: typeof rawOffsetX === 'number' ? rawOffsetX : 0,
        logo_offset_y: typeof rawOffsetY === 'number' ? rawOffsetY : 0,
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30 * 60 * 1000, // 30 分鐘
    }
  )
  return data ?? EMPTY_SETTINGS
}

/**
 * 寫入 workspace 設定後 invalidate SWR cache、讓全站 useWorkspaceSettings refetch 一次。
 *
 * 何時 call:
 *   - 公司設定頁 PATCH /api/workspaces/[id]/company-settings 成功後
 *   - 公司設定頁 「儲存」按鈕(寫整個 form 進 workspaces)成功後
 *   - 上傳 / 移除 logo / 印章後(這些經由 form 寫入、走儲存鈕)
 */
export function invalidateWorkspaceSettings(workspaceId: string): void {
  void mutate(buildSwrKey(workspaceId))
}
