'use client'

import { useEffect, useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'

interface WorkspaceBasic {
  legal_name: string | null
  name: string
  tax_id: string | null
  phone: string | null
  fax: string | null
  email: string | null
}

interface IpFormSectionProps {
  workspaceId: string
}

export function IpFormSection({ workspaceId }: IpFormSectionProps) {
  const { user } = useAuthStore()
  const [wsData, setWsData] = useState<WorkspaceBasic | null>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    void supabase
      .from('workspaces')
      .select('legal_name, name, tax_id, phone, fax, email')
      .eq('id', workspaceId)
      .single()
      .then(({ data }) => {
        if (data) setWsData(data as unknown as WorkspaceBasic)
      })
  }, [workspaceId])

  const handleGenerate = async () => {
    if (!wsData?.tax_id?.trim()) {
      toast.warning('此租戶尚未填寫統一編號，無法產生申請表')
      return
    }

    setGenerating(true)
    try {
      const { jsPDF } = await import('jspdf')
      const { loadChineseFonts } = await import('@/lib/pdf/pdf-fonts')
      const { generateIpApplicationForm } = await import('@/lib/pdf/ip-application-form')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      await loadChineseFonts(doc)

      const companyName = wsData.legal_name || wsData.name
      generateIpApplicationForm(doc, {
        companyName,
        taxId: wsData.tax_id ?? '',
        applicantName: user?.chinese_name ?? user?.display_name ?? '',
        phone: wsData.phone ?? '',
        fax: wsData.fax ?? '',
        email: wsData.email ?? '',
      })

      const filename = `藍新科技IP申請表_${companyName}_${new Date().toLocaleDateString('zh-TW').replace(/\//g, '')}.pdf`
      doc.save(filename)
      toast.success('申請表已下載，列印蓋章後傳真 (02)2286-3306')
    } catch (err) {
      logger.error('產生 IP 申請表失敗:', err)
      toast.error('產生申請表失敗，請稍後再試')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">藍新科技 IP 申請表</p>
          <p className="text-xs text-morandi-muted mt-0.5">
            旅行業代收轉付電子收據加值服務平台 — 產生申請表，漫途代為傳真申請 IP 白名單
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleGenerate}
          disabled={generating || !wsData}
          className="gap-1.5 flex-shrink-0"
        >
          {generating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileDown size={14} />
          )}
          {generating ? '產生中...' : '產生申請表'}
        </Button>
      </div>
      {wsData && !wsData.tax_id && (
        <p className="text-xs text-status-warning">⚠ 此租戶尚未設定統一編號，請先至公司設定補填</p>
      )}
    </div>
  )
}
