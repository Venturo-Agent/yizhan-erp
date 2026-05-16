'use client'

import React, { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SimpleDateInput } from '@/components/ui/simple-date-input'
import { CountryAirportSelector } from '@/components/selectors/CountryAirportSelector'
import { useEmployeesSlim } from '@/data'
import { useEligibleEmployees, ELIGIBILITY } from '@/app/(main)/orders/_hooks/useEligibleEmployees'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { NewTourData } from '../../_types'
import { TOUR_BASIC_INFO } from '../../_constants'
import { TOUR_STATUS } from '@/lib/constants/status-maps'
import { TOUR_TYPE_CODE_PREFIX, isNoDestinationServiceType } from '@/lib/constants/tour-service-types'

const COMPONENT_LABELS = {
  SELECT_TOUR_TYPE_PLACEHOLDER: '選擇團類型...',
} as const

interface TourBasicInfoProps {
  newTour: NewTourData
  setNewTour: React.Dispatch<React.SetStateAction<NewTourData>>
}

export function TourBasicInfo({ newTour, setNewTour }: TourBasicInfoProps) {
  const t = useTranslations('tour')
  const isProposalOrTemplate =
    newTour.status === TOUR_STATUS.PROPOSAL || newTour.status === TOUR_STATUS.TEMPLATE
  const { items: _employees = [] } = useEmployeesSlim({ all: true })
  const activeEmployees = (_employees || []).filter(
    e => (e as unknown as { status?: string }).status === 'active'
  )
  // 團控下拉：5/13 新概念、讀 employee_eligibilities（HR 員工頁勾選）
  const controllers = useEligibleEmployees(ELIGIBILITY.TOURS_AS_CONTROLLER)

  // 所有團類型定義
  const ALL_TOUR_CATEGORIES = [
    { id: 'tour_group', label: '旅遊團' },
    { id: 'flight', label: '機票' },
    { id: 'flight_hotel', label: '機加酒' },
    { id: 'hotel', label: '訂房' },
    { id: 'outsource', label: '外丟團' },
    { id: 'visa', label: '簽證' },
    { id: 'esim', label: '網卡' },
  ]

  // 不需選國家 / 機場的團類型：開團時只挑日期、tour code 用固定 prefix
  // OUT / VISA / ESIM 直接當「城市代碼」傳進 generate_tour_code RPC
  const NO_DESTINATION_TYPES: Record<string, string> = {
    outsource: 'OUT',
    visa: 'VISA',
    esim: 'ESIM',
  }
  const isNoDestinationType = !!newTour.tour_service_type && newTour.tour_service_type in NO_DESTINATION_TYPES

  // 從租戶設定讀取啟用的團類型
  const { user } = useAuthStore()
  const [enabledIds, setEnabledIds] = useState<string[] | null>(null)
  useEffect(() => {
    if (!user?.workspace_id) return
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
  }, [user?.workspace_id])

  // 過濾出實際可用的團類型
  const enabledTourCategories = ALL_TOUR_CATEGORIES.filter(cat =>
    enabledIds ? enabledIds.includes(cat.id) : true
  )

  // 🔧 核心表架構：接收完整國家資料
  const handleCountryChange = (data: { id: string; name: string; code: string }) => {
    setNewTour(prev => ({
      ...prev,
      countryId: data.id, // countries.id
      countryName: data.name, // 顯示用
      countryCode: data.code, // 用於過濾機場
      cityCode: '', // 清空機場
      cityName: '',
    }))
  }

  // 處理機場代碼變更
  const handleAirportChange = (airportCode: string, cityName: string) => {
    setNewTour(prev => ({
      ...prev,
      cityCode: airportCode,
      cityName: cityName,
    }))
  }

  // 團類型下拉 JSX（兩處可能用到）
  const tourTypeSelect = enabledTourCategories.length > 1 && (
    <div>
      <label className="text-sm font-medium text-morandi-primary">
        {t('tourFormTourType')} <span className="text-morandi-red">*</span>
      </label>
      <Select
        value={newTour.tour_service_type || enabledTourCategories[0]?.id || 'tour_group'}
        onValueChange={(
          value:
            | 'flight'
            | 'flight_hotel'
            | 'hotel'
            | 'tour_group'
            | 'outsource'
            | 'visa'
            | 'esim'
        ) =>
          setNewTour(prev => {
            // 切到「不需國家 / 機場」類型時、清掉之前選的國家 / 機場（避免殘留誤判）
            if (value in NO_DESTINATION_TYPES) {
              return {
                ...prev,
                tour_service_type: value,
                countryId: undefined,
                countryName: '',
                countryCode: '',
                cityCode: NO_DESTINATION_TYPES[value], // 直接帶 OUT / VISA / ESIM 當城市代碼
                cityName: '',
              }
            }
            // 從「不需」切回「需要」類型時、清掉前面塞的固定 prefix（讓使用者重選）
            const prevWasNoDest = prev.tour_service_type && prev.tour_service_type in NO_DESTINATION_TYPES
            return {
              ...prev,
              tour_service_type: value,
              cityCode: prevWasNoDest ? '' : prev.cityCode,
            }
          })
        }
      >
        <SelectTrigger className="mt-1">
          <SelectValue placeholder={COMPONENT_LABELS.SELECT_TOUR_TYPE_PLACEHOLDER} />
        </SelectTrigger>
        <SelectContent>
          {enabledTourCategories.map(category => (
            <SelectItem key={category.id} value={category.id}>
              {category.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* 團名 + 團類型 一半一半（若團類型下拉有啟用）*/}
      {tourTypeSelect ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {TOUR_BASIC_INFO.label_name}
            </label>
            <Input
              value={newTour.name}
              onChange={e => setNewTour(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1"
            />
          </div>
          {tourTypeSelect}
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {TOUR_BASIC_INFO.label_name}
          </label>
          <Input
            value={newTour.name}
            onChange={e => setNewTour(prev => ({ ...prev, name: e.target.value }))}
            className="mt-1"
          />
        </div>
      )}

      {/* 團控 — 建正式團時必填；提案 / 模板不問（提案不選團控、轉開團時 dialog 強制補）*/}
      {!isProposalOrTemplate && (
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            團控 <span className="text-morandi-red">*</span>
          </label>
          <Select
            value={newTour.controller_id || ''}
            onValueChange={(value: string) =>
              setNewTour(prev => ({ ...prev, controller_id: value }))
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="選擇團控..." />
            </SelectTrigger>
            <SelectContent>
              {controllers.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.display_name || emp.english_name || emp.chinese_name}{' '}
                  ({emp.employee_number})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[0.588rem] text-morandi-muted mt-1">
            團控控整團、必填。權限系統依此判斷誰能看到全團團員 / 訂單。
          </p>
        </div>
      )}


      {/* 國家/機場選擇 - 使用共用組件
          外丟團 / 簽證 / 網卡 三類不需選地點、tour code 走 OUT / VISA / ESIM 固定 prefix */}
      {!isNoDestinationType && (
        <CountryAirportSelector
          countryName={newTour.countryName}
          airportCode={newTour.cityCode}
          onCountryChange={handleCountryChange}
          onAirportChange={handleAirportChange}
          disablePortal
          showLabels
        />
      )}

      {isProposalOrTemplate ? (
        /* 提案/模板：只顯示天數 */
        <div>
          <label className="text-sm font-medium text-morandi-primary">
            {TOUR_BASIC_INFO.label_days_count}
          </label>
          <Input
            type="number"
            min={1}
            max={30}
            value={newTour.days_count || ''}
            onChange={e =>
              setNewTour(prev => ({ ...prev, days_count: parseInt(e.target.value) || null }))
            }
            className="mt-1 w-32"
          />
        </div>
      ) : (
        /* 正式團：顯示出發和回程日期 */
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {TOUR_BASIC_INFO.label_departure}
            </label>
            <SimpleDateInput
              value={newTour.departure_date}
              onChange={departure_date => {
                setNewTour(prev => {
                  const newReturnDate =
                    prev.return_date && prev.return_date < departure_date
                      ? departure_date
                      : prev.return_date

                  return {
                    ...prev,
                    departure_date,
                    return_date: newReturnDate,
                  }
                })
              }}
              className="mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {TOUR_BASIC_INFO.label_return}
            </label>
            <SimpleDateInput
              value={newTour.return_date}
              onChange={return_date => {
                setNewTour(prev => ({ ...prev, return_date }))
              }}
              min={newTour.departure_date}
              defaultMonth={newTour.departure_date}
              className="mt-1"
              required
            />
          </div>
        </div>
      )}

    </div>
  )
}
