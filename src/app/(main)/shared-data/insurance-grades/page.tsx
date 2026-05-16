'use client'

/**
 * /shared-data/insurance-grades
 *
 * 勞健保 / 勞退級距管理頁。
 *
 * 2026-05-15 William 拍板：
 *   - 列 3 種 kind (labor / health / pension) 的當前生效級距
 *   - 漫途 + 角落（有 shared_data_management.write）可編輯
 *   - 其他 workspace 唯讀
 *   - 每年 1/1 公告調整時、admin 進來 update
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Shield, Loader2 } from 'lucide-react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import { logger } from '@/lib/utils/logger'

interface GradeRow {
  id: string
  kind: 'labor' | 'health' | 'pension'
  grade_number: number
  monthly_amount: number
  effective_from: string
  effective_until: string | null
  source_url: string | null
  notes: string | null
}

const TAB_LABELS: Record<GradeRow['kind'], { title: string; desc: string; rate: string }> = {
  labor: {
    title: '勞工保險',
    desc: '11 級、最低 29,500 / 最高 45,800',
    rate: '費率 12.5%（員工 20% / 雇主 70% / 政府 10%）',
  },
  health: {
    title: '全民健康保險',
    desc: '58 級、12 組、最低 29,500 / 最高 313,000',
    rate: '費率 5.17%（員工 30% / 雇主 60% / 政府 10%）',
  },
  pension: {
    title: '勞工退休金（月提繳工資）',
    desc: '65 級、最低 29,500 / 最高 150,000',
    rate: '雇主強制 6% / 員工自願 0-6%',
  },
}

function formatNT(n: number): string {
  return `NT$ ${Number(n).toLocaleString('zh-TW')}`
}

type Tab = 'labor' | 'health' | 'pension'

export default function InsuranceGradesPage() {
  const [list, setList] = useState<GradeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('labor')
  const { has } = useMyCapabilities()
  const canEdit = has('shared_data_management.write')

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/shared-data/insurance-grades')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error || `載入失敗 HTTP ${res.status}`)
        return
      }
      const body = await res.json()
      setList(body.data ?? [])
    } catch (err) {
      logger.error('Load insurance grades failed:', err)
      toast.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  const filtered = useMemo(
    () => list.filter((r) => r.kind === activeTab).sort((a, b) => a.grade_number - b.grade_number),
    [list, activeTab]
  )

  const tabConfig = TAB_LABELS[activeTab]

  return (
    <ContentPageLayout
      title="勞健保級距"
      icon={Shield}
      tabs={[
        { value: 'labor', label: '勞保' },
        { value: 'health', label: '健保' },
        { value: 'pension', label: '勞退' },
      ]}
      activeTab={activeTab}
      onTabChange={(v) => setActiveTab(v as Tab)}
      breadcrumb={[
        { label: '共用資料管理', href: '/shared-data' },
        { label: '勞健保級距', href: '/shared-data/insurance-grades' },
      ]}
    >
      <Card className="p-5 mb-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-morandi-gold mt-0.5" strokeWidth={1.5} />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-morandi-primary">{tabConfig.title}</h3>
            <p className="text-xs text-morandi-secondary mt-1">{tabConfig.desc}</p>
            <p className="text-xs text-morandi-muted mt-1">{tabConfig.rate}</p>
          </div>
          {!canEdit && <Badge variant="outline">唯讀</Badge>}
        </div>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-12 text-morandi-secondary">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          載入中...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <Card className="p-12 text-center text-morandi-secondary">
          <p className="text-sm">{tabConfig.title} 尚無資料</p>
          {canEdit && (
            <p className="text-xs text-morandi-muted mt-2">
              漫途 admin：請從勞動部 / 健保署官網拿最新級距、補進來
            </p>
          )}
        </Card>
      )}

      {!loading && filtered.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-morandi-container/30">
                <tr className="text-left text-xs text-morandi-secondary">
                  <th className="px-4 py-3">級數</th>
                  <th className="px-4 py-3 text-right">月投保金額</th>
                  <th className="px-4 py-3">生效日</th>
                  <th className="px-4 py-3">資料來源</th>
                  <th className="px-4 py-3">備註</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-morandi-muted/10">
                    <td className="px-4 py-3 font-mono text-morandi-primary">{row.grade_number}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {formatNT(row.monthly_amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-morandi-secondary">
                      {row.effective_from.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {row.source_url ? (
                        <a
                          href={row.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-morandi-gold underline truncate inline-block max-w-[200px]"
                        >
                          官方連結
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-morandi-muted">{row.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {canEdit && filtered.length > 0 && filtered.length < (activeTab === 'health' ? 58 : activeTab === 'pension' ? 65 : 11) && (
        <p className="text-xs text-orange-600 mt-3">
          ⚠ {tabConfig.title} 級距不完整、目前 {filtered.length} 筆、官方應有
          {activeTab === 'health' ? 58 : activeTab === 'pension' ? 65 : 11} 級。
          請從官方網站補完整資料（編輯 UI 之後上、目前可請 dev 用 SQL 補）。
        </p>
      )}
    </ContentPageLayout>
  )
}
