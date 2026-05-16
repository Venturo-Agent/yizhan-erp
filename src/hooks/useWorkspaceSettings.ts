import { useState, useEffect } from 'react'
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
}

const SELECT_FIELDS =
  'name, phone, address, bank_name, bank_branch, bank_account, bank_account_name, legal_name, subtitle, logo_url, fax, email, website, tax_id, company_seal_url, personal_seal_url, invoice_seal_image_url' as const

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
