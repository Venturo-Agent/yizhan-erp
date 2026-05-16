'use client'

import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'

interface Props {
  /** workspace 基本資料（從 company settings 已載入的 form state 傳進來） */
  companyName: string
  taxId: string
  phone: string
  fax?: string
  email?: string
}

export function IpApplicationFormButton({ companyName, taxId, phone, fax, email }: Props) {
  const [generating, setGenerating] = useState(false)
  const { user } = useAuthStore()

  const handleGenerate = async () => {
    if (!taxId.trim()) {
      toast.warning('請先在公司設定填寫「統一編號」再產生申請表')
      return
    }
    if (!companyName.trim()) {
      toast.warning('請先在公司設定填寫「公司名稱」再產生申請表')
      return
    }

    setGenerating(true)
    try {
      const { jsPDF } = await import('jspdf')
      const { loadChineseFonts } = await import('@/lib/pdf/pdf-fonts')
      const { generateIpApplicationForm } = await import('@/lib/pdf/ip-application-form')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      await loadChineseFonts(doc)

      generateIpApplicationForm(doc, {
        companyName: companyName || '',
        taxId: taxId || '',
        applicantName: user?.chinese_name ?? user?.display_name ?? '',
        phone: phone || '',
        fax: fax || '',
        email: email || '',
      })

      const filename = `藍新科技IP申請表_${companyName}_${new Date().toLocaleDateString('zh-TW').replace(/\//g, '')}.pdf`
      doc.save(filename)
      toast.success('申請表已下載，請列印蓋章後傳真至 (02)2286-3306')
    } catch (err) {
      logger.error('產生 IP 申請表失敗:', err)
      toast.error('產生申請表失敗，請稍後再試')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGenerate}
      disabled={generating}
      className="gap-2"
    >
      <FileDown size={16} />
      {generating ? '產生中...' : '產生 IP 申請表'}
    </Button>
  )
}
