'use client'

import React from 'react'
import { TourFormData } from '../types'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, AlertCircle, FileX, GripVertical } from 'lucide-react'
import { COMP_EDITOR_LABELS } from '../../constants/labels'

interface NoticesPolicySectionProps {
  data: TourFormData
  onChange: (data: TourFormData) => void
}

// 預設提醒事項
const getDefaultNotices = (): string[] => [
  COMP_EDITOR_LABELS.本行程之最低出團人數為4人_含_以上,
  COMP_EDITOR_LABELS.行程內容僅供出發前參考_最終行程_航班時刻及住宿安排_請以行前說明會提供之資料為準,
  COMP_EDITOR_LABELS.各日行程將依當地交通與實際狀況彈性調整_如景點順序_住宿安排與參觀時間_均由專業領隊現場妥善規劃_敬請旅客理解與配合,
  COMP_EDITOR_LABELS.團費已包含機場稅_燃油附加費及領隊_導遊服務費_惟不包含其他個別性小費_如司機_行李員_飯店服務人員之服務小費,
  COMP_EDITOR_LABELS.因應國際油價波動_航空公司可能調整燃油附加費_相關費用將依實際票務成本調整計算,
  COMP_EDITOR_LABELS.住宿以雙人房為主_兩張單人床或一張大床_如需求三人房_將視飯店實際情況安排加床_多為折疊床或沙發床_空間較為有限_若需單人房_請於報名時提出並補足房差費用,
  COMP_EDITOR_LABELS.航空公司座位安排_非廉價航空_多提供班機起飛前48小時內的網路與手機報到免費選位服務_惟額外加長座位_如出口座位_不包含於免費選位範圍內,
]

// 預設取消政策
const getDefaultCancellationPolicy = (): string[] => [
  COMP_EDITOR_LABELS.旅客繳交訂金後_即視為_國外旅遊定型化契約_正式生效_旅行社將依各合作單位_如飯店_餐廳_行程體驗業者_之規定_陸續預付旅程相關費用_若旅客因個人因素取消行程_將依契約條款辦理_或視實際已支出金額酌收相關費用後_退還剩餘款項,
  COMP_EDITOR_LABELS.由於本行程多數項目須事前預約安排_若旅客於旅途中臨時於國外提出無法參與之通知_將視同自動放棄_相關費用恕無法退還_敬請理解與配合,
]

export function NoticesPolicySection({ data, onChange }: NoticesPolicySectionProps) {
  const notices = data.notices || []
  const cancellationPolicy = data.cancellationPolicy || []

  // 更新提醒事項
  const updateNotice = (index: number, value: string) => {
    const newNotices = [...notices]
    newNotices[index] = value
    onChange({ ...data, notices: newNotices })
  }

  // 新增提醒事項
  const addNotice = () => {
    onChange({ ...data, notices: [...notices, ''] })
  }

  // 刪除提醒事項
  const removeNotice = (index: number) => {
    const newNotices = notices.filter((_, i) => i !== index)
    onChange({ ...data, notices: newNotices })
  }

  // 更新取消政策
  const updateCancellationPolicy = (index: number, value: string) => {
    const newPolicy = [...cancellationPolicy]
    newPolicy[index] = value
    onChange({ ...data, cancellationPolicy: newPolicy })
  }

  // 新增取消政策
  const addCancellationPolicy = () => {
    onChange({ ...data, cancellationPolicy: [...cancellationPolicy, ''] })
  }

  // 刪除取消政策
  const removeCancellationPolicy = (index: number) => {
    const newPolicy = cancellationPolicy.filter((_, i) => i !== index)
    onChange({ ...data, cancellationPolicy: newPolicy })
  }

  return (
    <div className="space-y-8">
      {/* ===== 提醒事項 ===== */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-morandi-primary border-b-2 border-morandi-gold pb-1">
          {COMP_EDITOR_LABELS.LABEL_1764}
        </h2>

        {/* 顯示開關 */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-status-warning" />
            <div>
              <h3 className="font-medium text-morandi-primary">{COMP_EDITOR_LABELS.LABEL_9164}</h3>
              <p className="text-sm text-morandi-secondary">{COMP_EDITOR_LABELS.LABEL_379}</p>
            </div>
          </div>
          <Switch
            checked={data.showNotices || false}
            onCheckedChange={checked => {
              onChange({
                ...data,
                showNotices: checked,
                notices: checked && notices.length === 0 ? getDefaultNotices() : notices,
              })
            }}
          />
        </div>

        {/* 提醒事項列表 */}
        {data.showNotices && (
          <div className="space-y-3">
            {notices.map((notice, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex items-start pt-2">
                  <GripVertical className="h-4 w-4 text-morandi-muted/60" />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-morandi-primary">
                    {COMP_EDITOR_LABELS.LABEL_104} {index + 1} 項
                  </Label>
                  <Textarea
                    value={notice}
                    onChange={e => updateNotice(index, e.target.value)}
                    placeholder={COMP_EDITOR_LABELS.輸入提醒事項}
                    className="mt-1 min-h-[3.75rem]"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeNotice(index)}
                  className="h-8 w-8 p-0 text-morandi-muted hover:text-status-danger mt-6"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="soft-gold"
              onClick={addNotice}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              {COMP_EDITOR_LABELS.ADD_7126}
            </Button>
          </div>
        )}
      </div>

      {/* ===== 取消政策 ===== */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-morandi-primary border-b-2 border-morandi-gold pb-1">
          {COMP_EDITOR_LABELS.LABEL_4129}
        </h2>

        {/* 顯示開關 */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <FileX className="h-5 w-5 text-morandi-red" />
            <div>
              <h3 className="font-medium text-morandi-primary">{COMP_EDITOR_LABELS.LABEL_9277}</h3>
              <p className="text-sm text-morandi-secondary">{COMP_EDITOR_LABELS.LABEL_4169}</p>
            </div>
          </div>
          <Switch
            checked={data.showCancellationPolicy || false}
            onCheckedChange={checked => {
              onChange({
                ...data,
                showCancellationPolicy: checked,
                cancellationPolicy:
                  checked && cancellationPolicy.length === 0
                    ? getDefaultCancellationPolicy()
                    : cancellationPolicy,
              })
            }}
          />
        </div>

        {/* 取消政策列表 */}
        {data.showCancellationPolicy && (
          <div className="space-y-3">
            {cancellationPolicy.map((policy, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex items-start pt-2">
                  <GripVertical className="h-4 w-4 text-morandi-muted/60" />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-morandi-primary">
                    {COMP_EDITOR_LABELS.LABEL_104} {index + 1} 項
                  </Label>
                  <Textarea
                    value={policy}
                    onChange={e => updateCancellationPolicy(index, e.target.value)}
                    placeholder={COMP_EDITOR_LABELS.輸入取消政策}
                    className="mt-1 min-h-[5rem]"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCancellationPolicy(index)}
                  className="h-8 w-8 p-0 text-morandi-muted hover:text-status-danger mt-6"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="soft-gold"
              onClick={addCancellationPolicy}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              {COMP_EDITOR_LABELS.ADD_8816}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
