'use client'

/**
 * TourPrintDialog - 團體列印對話框
 * 整合所有列印功能：成員名單、航班確認單、住宿確認單
 *
 * 子模組：
 * - tour-print-airline-data.ts — 機場/航空公司靜態對照表
 * - TourPrintMemberList.tsx   — 航班/住宿共用成員勾選列表
 * - print-templates/          — 列印 HTML 產生器
 * - tour-print-constants.ts   — 欄位 labels / 預設欄位
 */

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Printer, X, Plane, Hotel, Users, Check, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useReferenceData } from '@/lib/pnr'
import type { Tour } from '@/stores/types'
import type {
  OrderMember,
  ExportColumnsConfig,
} from '@/app/(main)/orders/_types/order-member.types'
type PNR = unknown
import { COLUMN_LABELS, DEFAULT_COLUMNS } from './tour-print-constants'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import {
  generateMembersPrintContent,
  generateFlightPrintContent,
  generateHotelPrintContent,
} from './print-templates'
import { AIRPORT_NAMES, AIRLINE_NAMES } from './tour-print-airline-data'
import { TourPrintMemberList } from './TourPrintMemberList'

const COMPONENT_LABELS = {
  NO_MEMBERS_SELECTED: '沒有選取任何成員',
  NO_MEMBERS_SELECTED_FOR_EXPORT: '沒有選取任何成員，請先勾選要匯出的成員',
  GENDER_MALE: '男',
  GENDER_FEMALE: '女',
  HOTEL_NOT_SET: '未設定住宿',
  MEMBER_LIST_SHEET: '團員名單',
  MEMBER_LIST_FILENAME_SUFFIX: '團員名單',
  SEQUENCE: '序',
  PNR_LABEL: 'PNR:',
  PRINT_COUNT: (count: number) => `列印 (${count} 人)`,
} as const

interface TourPrintDialogProps {
  isOpen: boolean
  tour: Tour
  members: OrderMember[]
  onClose: () => void
}

export function TourPrintDialog({ isOpen, tour, members, onClose }: TourPrintDialogProps) {
  const t = useTranslations('tour')
  // 依團類型決定要顯示哪些 tab
  const tourServiceType = (tour as { tour_service_type?: string | null }).tour_service_type
  const showFlightTab =
    !tourServiceType ||
    tourServiceType === 'tour_group' ||
    tourServiceType === 'flight' ||
    tourServiceType === 'flight_hotel'
  const showHotelTab =
    !tourServiceType ||
    tourServiceType === 'tour_group' ||
    tourServiceType === 'hotel' ||
    tourServiceType === 'flight_hotel'

  const [activeTab, setActiveTab] = useState<'members' | 'flight' | 'hotel'>('members')
  const [columns, setColumns] = useState<ExportColumnsConfig>(DEFAULT_COLUMNS)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())

  // 當 members 變動或 dialog 開啟時，重新初始化選中清單
  useEffect(() => {
    if (!isOpen) return
    setSelectedMembers(
      new Set(
        members.filter(m => m.chinese_name || m.passport_name || m.passport_number).map(m => m.id)
      )
    )
  }, [isOpen, members])

  const [pnrData, setPnrData] = useState<PNR[]>([])
  const [loadingPnr, setLoadingPnr] = useState(false)

  const { getAirportName: getAirportNameFromDb, getAirlineName: getAirlineNameFromDb } =
    useReferenceData({ enabled: false })

  const getAirportName = (code: string) => {
    const dbName = getAirportNameFromDb(code)
    if (dbName && dbName !== code) return dbName
    return AIRPORT_NAMES[code] || code
  }

  const getAirlineName = (code: string) => {
    const dbName = getAirlineNameFromDb(code)
    if (dbName && dbName !== code) return dbName
    return AIRLINE_NAMES[code] || code
  }

  useEffect(() => {
    setPnrData([])
    setLoadingPnr(false)
  }, [isOpen, tour.id])

  // 欄位 & 成員選擇
  const toggleColumn = (key: keyof ExportColumnsConfig) =>
    setColumns({ ...columns, [key]: !columns[key] })
  const toggleAllColumns = () => {
    const allSelected = Object.values(columns).every(v => v)
    setColumns(
      Object.keys(columns).reduce(
        (acc, key) => ({ ...acc, [key]: !allSelected }),
        {} as ExportColumnsConfig
      )
    )
  }
  const toggleMember = (memberId: string) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(memberId)) newSelected.delete(memberId)
    else newSelected.add(memberId)
    setSelectedMembers(newSelected)
  }
  const toggleAllMembers = () => {
    setSelectedMembers(
      selectedMembers.size === members.length ? new Set() : new Set(members.map(m => m.id))
    )
  }

  // 開啟列印視窗
  const openPrintWindow = (content: string) => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(content)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 250)
    }
    onClose()
  }

  // 列印成員名單
  const handlePrintMembers = () => {
    const printMembers = members.filter(m => selectedMembers.has(m.id))
    if (printMembers.length === 0) {
      toast.error(COMPONENT_LABELS.NO_MEMBERS_SELECTED)
      return
    }
    openPrintWindow(generateMembersPrintContent({ tour, members: printMembers, columns }))
  }

  // 列印航班確認單
  const handlePrintFlightConfirmation = () => {
    const printMembers = members.filter(m => selectedMembers.has(m.id))
    if (printMembers.length === 0) {
      toast.error(COMPONENT_LABELS.NO_MEMBERS_SELECTED)
      return
    }
    openPrintWindow(
      generateFlightPrintContent({
        tour,
        members: printMembers,
        pnrData,
        getAirportName,
        getAirlineName,
      })
    )
  }

  // 列印住宿確認單
  const handlePrintHotelConfirmation = () => {
    const printMembers = members.filter(m => selectedMembers.has(m.id))
    if (printMembers.length === 0) {
      toast.error(COMPONENT_LABELS.NO_MEMBERS_SELECTED)
      return
    }
    openPrintWindow(generateHotelPrintContent({ tour, members: printMembers }))
  }

  // 匯出 Excel
  const handleExportExcel = async () => {
    const selectedColumns = Object.entries(columns)
      .filter(([, selected]) => selected)
      .map(([key]) => key as keyof ExportColumnsConfig)

    if (selectedColumns.length === 0) return

    const exportMembers = members.filter(m => selectedMembers.has(m.id))
    if (exportMembers.length === 0) {
      toast.error(COMPONENT_LABELS.NO_MEMBERS_SELECTED_FOR_EXPORT)
      return
    }

    const XLSX = await import('xlsx')
    const data = exportMembers.map((member, idx) => {
      const row: Record<string, string | number> = { [COMPONENT_LABELS.SEQUENCE]: idx + 1 }
      selectedColumns.forEach(col => {
        const label = COLUMN_LABELS[col]
        switch (col) {
          case 'gender':
            row[label] =
              member.gender === 'M'
                ? COMPONENT_LABELS.GENDER_MALE
                : member.gender === 'F'
                  ? COMPONENT_LABELS.GENDER_FEMALE
                  : ''
            break
          case 'balance':
            row[label] = (member.total_payable || 0) - (member.deposit_amount || 0)
            break
          case 'total_payable':
          case 'deposit_amount':
            row[label] = member[col] || 0
            break
          default:
            row[label] = (member[col as keyof OrderMember] as string) || ''
        }
      })
      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, COMPONENT_LABELS.MEMBER_LIST_SHEET)

    const colWidths = [{ wch: 5 }]
    selectedColumns.forEach(col => {
      if (['chinese_name', 'passport_name'].includes(col)) colWidths.push({ wch: 20 })
      else if (['remarks', 'special_meal'].includes(col)) colWidths.push({ wch: 25 })
      else if (['total_payable', 'deposit_amount', 'balance'].includes(col))
        colWidths.push({ wch: 12 })
      else colWidths.push({ wch: 15 })
    })
    worksheet['!cols'] = colWidths

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    XLSX.writeFile(
      workbook,
      `${tour.code}_${COMPONENT_LABELS.MEMBER_LIST_FILENAME_SUFFIX}_${today}.xlsx`
    )
  }

  const selectedCount = selectedMembers.size

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent level={2} className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer size={18} />
            {t('printDialogTitle')} - {tour.code}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
          <TabsList
            className="grid w-full"
            style={{
              gridTemplateColumns: `repeat(${1 + (showFlightTab ? 1 : 0) + (showHotelTab ? 1 : 0)}, minmax(0, 1fr))`,
            }}
          >
            <TabsTrigger value="members" className="gap-1">
              <Users size={14} />
              {t('printMemberList')}
            </TabsTrigger>
            {showFlightTab && (
              <TabsTrigger value="flight" className="gap-1">
                <Plane size={14} />
                {t('printFlightConfirm')}
              </TabsTrigger>
            )}
            {showHotelTab && (
              <TabsTrigger value="hotel" className="gap-1">
                <Hotel size={14} />
                {t('printHotelConfirm')}
              </TabsTrigger>
            )}
          </TabsList>

          {/* 成員名單 Tab */}
          <TabsContent value="members" className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-morandi-secondary">{t('printSelectColumns')}</span>
              <Button variant="ghost" size="sm" onClick={toggleAllColumns}>
                {Object.values(columns).every(v => v) ? t('printDeselectAll') : t('printSelectAll')}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
              {(Object.keys(columns) as (keyof ExportColumnsConfig)[]).map(key => (
                <label
                  key={key}
                  className="flex items-center gap-2 p-2 rounded hover:bg-morandi-bg cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={columns[key]}
                    onChange={() => toggleColumn(key)}
                    className="rounded border-border"
                  />
                  <span className="text-sm">{COLUMN_LABELS[key]}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="soft-gold" onClick={onClose}>
                <X size={16} className="mr-1" />
                {t('printCancel')}
              </Button>
              <Button variant="soft-gold" onClick={handleExportExcel}>
                <FileSpreadsheet size={16} className="mr-1" />
                {t('printExcel')}
              </Button>
              <Button variant="soft-gold" onClick={handlePrintMembers}>
                <Printer size={16} className="mr-1" />
                {t('printPrint')}
              </Button>
            </div>
          </TabsContent>

          {/* 航班確認單 Tab */}
          <TabsContent value="flight" className="space-y-4">
            <div className="text-sm text-morandi-secondary mb-2">
              {t('printSelectFlightMembers')}
              {loadingPnr && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Spinner size="sm" />
                  {t('printLoadingFlight')}
                </span>
              )}
              {!loadingPnr && pnrData.length > 0 && (
                <span className="ml-2 text-morandi-green">
                  {t('printPNRLoaded', { count: pnrData.length })}
                </span>
              )}
            </div>
            <TourPrintMemberList
              members={members}
              selectedMembers={selectedMembers}
              toggleMember={toggleMember}
              toggleAllMembers={toggleAllMembers}
              renderDetail={member => (
                <div className="text-xs text-morandi-secondary flex gap-2">
                  <span>
                    {COMPONENT_LABELS.PNR_LABEL} {member.pnr || '-'}
                  </span>
                  <span>
                    {t('printTicketNo')} {member.ticket_number || '-'}
                  </span>
                </div>
              )}
              renderBadge={member =>
                member.ticket_number ? <Check size={14} className="text-morandi-green" /> : null
              }
            />
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="soft-gold" onClick={onClose}>
                <X size={16} className="mr-1" />
                {t('printCancel')}
              </Button>
              <Button
                variant="soft-gold"
                onClick={handlePrintFlightConfirmation}
                disabled={selectedCount === 0}
              >
                <Printer size={16} className="mr-1" />
                {COMPONENT_LABELS.PRINT_COUNT(selectedCount)}
              </Button>
            </div>
          </TabsContent>

          {/* 住宿確認單 Tab */}
          <TabsContent value="hotel" className="space-y-4">
            <div className="text-sm text-morandi-secondary mb-2">
              {t('printSelectHotelMembers')}
            </div>
            <TourPrintMemberList
              members={members}
              selectedMembers={selectedMembers}
              toggleMember={toggleMember}
              toggleAllMembers={toggleAllMembers}
              renderDetail={member => (
                <div className="text-xs text-morandi-secondary">
                  {member.hotel_1_name || COMPONENT_LABELS.HOTEL_NOT_SET}
                  {member.hotel_2_name && ` / ${member.hotel_2_name}`}
                </div>
              )}
              renderBadge={member =>
                member.hotel_1_name ? <Check size={14} className="text-morandi-green" /> : null
              }
            />
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="soft-gold" onClick={onClose}>
                <X size={16} className="mr-1" />
                {t('printCancel')}
              </Button>
              <Button
                variant="soft-gold"
                onClick={handlePrintHotelConfirmation}
                disabled={selectedCount === 0}
              >
                <Printer size={16} className="mr-1" />
                {COMPONENT_LABELS.PRINT_COUNT(selectedCount)}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
