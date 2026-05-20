import { useState, useEffect } from 'react'
import type React from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'

interface WorkspaceSettings {
  name: string
  phone: string
  address: string
  bank_name: string
  bank_branch: string
  bank_account: string
  bank_account_name: string
  // 新增欄位
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
}

const EMPTY_SETTINGS: WorkspaceSettings = {
  name: '',
  phone: '',
  address: '',
  bank_name: '',
  bank_branch: '',
  bank_account: '',
  bank_account_name: '',
  // 新增欄位
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
}

const SELECT_FIELDS =
  'name, phone, address, bank_name, bank_branch, bank_account, bank_account_name, legal_name, subtitle, logo_url, fax, email, website, tax_id, company_seal_url, personal_seal_url, invoice_seal_image_url, logo_scale, logo_offset_x' as const

/**
 * Logo 規範
 * - 列印文件：max-width: 150px, max-height: 40px
 * - 網頁 Header：max-width: 120px, max-height: 36px
 */
const LOGO_CONSTRAINTS = {
  print: {
    maxWidth: 150,
    maxHeight: 40,
  },
  header: {
    maxWidth: 120,
    maxHeight: 36,
  },
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
 * 取得列印頁首 logo wrapper 樣式(套用公司設定的 scale + offsetX)
 *
 * 用法:
 *   const ws = useWorkspaceSettings()
 *   <div style={getPrintLogoBoxStyle(ws)}>
 *     <img src={ws.logo_url} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
 *   </div>
 *
 * Base size 120×40(對齊 src/lib/print/PrintHeader.tsx)、scale 1.0 = 100%。
 * left 位移 = offsetX px、top 鎖 0(只允許水平移動)。
 */
export function getPrintLogoBoxStyle(
  ws: Pick<WorkspaceSettings, 'logo_scale' | 'logo_offset_x'>
): React.CSSProperties {
  const scale = typeof ws.logo_scale === 'number' && ws.logo_scale > 0 ? ws.logo_scale : 1.0
  const offsetX = typeof ws.logo_offset_x === 'number' ? ws.logo_offset_x : 0
  return {
    position: 'absolute',
    left: `${offsetX}px`,
    top: 0,
    width: `${120 * scale}px`,
    height: `${40 * scale}px`,
  }
}

/**
 * 取得目前 workspace 的公司設定（銀行資訊、電話、地址、logo 等）
 * 用於列印模板、信封等需要動態讀取公司資訊的場景
 */
export function useWorkspaceSettings(): WorkspaceSettings {
  const workspaceId = useAuthStore(state => state.user?.workspace_id)
  const [settings, setSettings] = useState<WorkspaceSettings>(EMPTY_SETTINGS)

  useEffect(() => {
    if (!workspaceId) return

    let cancelled = false

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('workspaces')
          .select(SELECT_FIELDS)
          .eq('id', workspaceId)
          .single()

        if (error) {
          logger.error('載入 workspace 設定失敗:', error)
          return
        }

        if (!cancelled && data) {
          const rawScale = (data as Record<string, unknown>).logo_scale
          const rawOffsetX = (data as Record<string, unknown>).logo_offset_x
          setSettings({
            name: data.name ?? '',
            phone: data.phone ?? '',
            address: data.address ?? '',
            bank_name: data.bank_name ?? '',
            bank_branch: data.bank_branch ?? '',
            bank_account: data.bank_account ?? '',
            bank_account_name: data.bank_account_name ?? '',
            // 新增欄位
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
          })
        }
      } catch (err) {
        logger.error('載入 workspace 設定錯誤:', err)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [workspaceId])

  return settings
}
