'use client'

import React, { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, CheckSquare } from 'lucide-react'
import { Tour } from '@/stores/types'
import { useTourEdit } from '../_hooks/useTourEdit'
import { CountryAirportSelector } from '@/components/selectors/CountryAirportSelector'
import { Input } from '@/components/ui/input'
import { SimpleDateInput } from '@/components/ui/simple-date-input'
import { ItinerarySyncDialog } from './ItinerarySyncDialog'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

const COMPONENT_LABELS = {
  TOUR_NAME: '旅遊團名稱',
  TOUR_TYPE: '團類型',
  DEPARTURE_DATE: '出發日期',
  RETURN_DATE: '返回日期',
  DESCRIPTION: '描述',
} as const

const ALL_TOUR_CATEGORIES = [
  { id: 'tour_group', label: '旅遊團' },
  { id: 'flight', label: '機票' },
  { id: 'flight_hotel', label: '機加酒' },
  { id: 'hotel', label: '訂房' },
]

interface TourEditDialogProps {
  isOpen: boolean
  onClose: () => void
  tour: Tour
  onSuccess?: (updatedTour: Tour) => void
}

export function TourEditDialog({ isOpen, onClose, tour, onSuccess }: TourEditDialogProps) {
  const t = useTranslations('tour')
  const {
    formData,
    setFormData,
    submitting,
    handleSubmit,
    // Sync dialog state
    syncDialogOpen,
    syncInfo,
    handleSync,
    closeSyncDialog,
  } = useTourEdit({ tour, isOpen, onClose, onSuccess })

  // 讀取租戶啟用的團類型
  const { user } = useAuthStore()
  const [enabledIds, setEnabledIds] = useState<string[] | null>(null)
  useEffect(() => {
    if (!user?.workspace_id || !isOpen) return
    const wsId = user.workspace_id
    const load = async () => {
      try {
        const { data } = await supabase.from('workspaces').select('*').eq('id', wsId).single()
        const ids = (data as { enabled_tour_categories?: string[] } | null)?.enabled_tour_categories
        if (Array.isArray(ids) && ids.length > 0) {
          setEnabledIds(ids)
        } else {
          setEnabledIds(ALL_TOUR_CATEGORIES.map(c => c.id))
        }
      } catch (err) {
        logger.error('載入團類型設定失敗:', err)
        setEnabledIds(ALL_TOUR_CATEGORIES.map(c => c.id))
      }
    }
    void load()
  }, [user?.workspace_id, isOpen])
  const enabledTourCategories = ALL_TOUR_CATEGORIES.filter(cat =>
    enabledIds ? enabledIds.includes(cat.id) : true
  )

  // 🔧 核心表架構：國家變更 → 接收完整 {id, name, code}
  const handleCountryChange = (data: { id: string; name: string; code: string }) => {
    setFormData(prev => ({
      ...prev,
      countryId: data.id,
      countryName: data.name,
      airportCode: '',
      airportCityName: '',
    }))
  }

  // 機場變更
  const handleAirportChange = (airportCode: string, cityName: string) => {
    setFormData(prev => ({
      ...prev,
      airportCode,
      airportCityName: cityName,
    }))
  }

  // 處理出發日期變更
  const handleDepartureDateChange = (departure_date: string) => {
    setFormData(prev => ({
      ...prev,
      departure_date,
      return_date:
        prev.return_date && prev.return_date < departure_date ? departure_date : prev.return_date,
    }))
  }

  return (
    <>
      <Dialog
        open={isOpen && !syncDialogOpen}
        onOpenChange={open => {
          // 只有在 syncDialogOpen 為 false 時，才允許關閉
          // 避免切換到 sync dialog 時誤觸 onClose
          if (!open && !syncDialogOpen) {
            onClose()
          }
        }}
      >
        <DialogContent
          level={2}
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          aria-describedby={undefined}
          onInteractOutside={e => {
            const target = e.target as HTMLElement
            if (target.closest('[role="listbox"]') || target.closest('select')) {
              e.preventDefault()
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('editTourDialogTitle')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 旅遊團名稱 */}
            <div>
              <label className="text-sm font-medium text-morandi-primary">
                {COMPONENT_LABELS.TOUR_NAME}
              </label>
              <Input
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>

            {/* 團類型（編輯模式可改 — 例如機票團改成機加酒） */}
            {enabledTourCategories.length > 1 && (
              <div>
                <label className="text-sm font-medium text-morandi-primary">
                  {COMPONENT_LABELS.TOUR_TYPE}
                </label>
                <Select
                  value={formData.tour_service_type || 'tour_group'}
                  onValueChange={value =>
                    setFormData(prev => ({ ...prev, tour_service_type: value }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledTourCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 🔧 核心表架構：統一用 CountryAirportSelector */}
            <CountryAirportSelector
              countryName={formData.countryName}
              airportCode={formData.airportCode}
              onCountryChange={handleCountryChange}
              onAirportChange={handleAirportChange}
              disablePortal
              showLabels
            />

            {/* 日期 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-morandi-primary">
                  {COMPONENT_LABELS.DEPARTURE_DATE}
                </label>
                <SimpleDateInput
                  value={formData.departure_date}
                  onChange={handleDepartureDateChange}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-morandi-primary">
                  {COMPONENT_LABELS.RETURN_DATE}
                </label>
                <SimpleDateInput
                  value={formData.return_date}
                  onChange={return_date => setFormData(prev => ({ ...prev, return_date }))}
                  min={formData.departure_date}
                  className="mt-1"
                />
              </div>
            </div>

            {/* 描述 */}
            <div>
              <label className="text-sm font-medium text-morandi-primary">
                {COMPONENT_LABELS.DESCRIPTION}
              </label>
              <Input
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1"
              />
            </div>

            {/* 選項 */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-enableCheckin"
                  checked={formData.enable_checkin}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, enable_checkin: e.target.checked }))
                  }
                  className="rounded"
                />
                <label htmlFor="edit-enableCheckin" className="text-sm text-morandi-primary">
                  {t('editTourCheckinEnable')}
                </label>
              </div>
            </div>
          </div>

          {/* 按鈕 */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="soft-gold" onClick={onClose} disabled={submitting} className="gap-1">
              <X size={16} />
              {t('editTourCancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                submitting ||
                !formData.name.trim() ||
                !formData.departure_date ||
                !formData.return_date
              }
              variant="morandi-gold"
            >
              <CheckSquare size="1em" />
              {submitting ? t('editTourSaving') : t('editTourSave')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 行程表同步對話框 */}
      <ItinerarySyncDialog
        open={syncDialogOpen}
        syncInfo={syncInfo}
        onSync={handleSync}
        onClose={closeSyncDialog}
      />
    </>
  )
}
