'use client'
/**
 * PackageItineraryDialog - 行程表對話框
 * 功能：建立新行程表 / 查看已關聯行程表
 */

import { useTranslations } from 'next-intl'
import { FileText, Save, AlertCircle, Eye, FilePlus, Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PackageItineraryDialogProps } from './types'
import { usePackageItinerary } from './usePackageItinerary'
import { FlightSection } from './FlightSection'
import { useIsIntegrationEnabled } from '@/lib/permissions/useIntegrationEnabled'
import { DailyScheduleEditor } from './DailyScheduleEditor'
import { TimelineEditor } from './TimelineEditor'
import { ItineraryPreviewContent } from './ItineraryPreview'
import { VersionDropdown } from './VersionDropdown'

import { Spinner } from '@/components/ui/spinner'
export function PackageItineraryDialog({
  isOpen,
  onClose,
  context: ctx,
  onItineraryCreated,
}: PackageItineraryDialogProps) {
  const hook = usePackageItinerary({
    isOpen,
    context: ctx,
    onClose,
    onItineraryCreated,
  })
  // Integration 守門：航班搜尋（階段 4：改讀 workspace_integrations）
  const t = useTranslations('tour')
  const { enabled: flightSearchEnabled } = useIsIntegrationEnabled('flight_search')

  return (
    <>
      {/* 主對話框 */}
      <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
        <DialogContent level={2} className="max-w-5xl max-h-[90vh] overflow-hidden">
          {/* 載入中 */}
          {hook.isDataLoading ? (
            <div className="h-64 flex items-center justify-center">
              <VisuallyHidden>
                <DialogTitle>{t('packageDialogLoading')}</DialogTitle>
              </VisuallyHidden>
              <Spinner size="lg" className="text-morandi-gold" />
            </div>
          ) : hook.viewMode === 'preview' ? (
            /* 預覽模式 */
            <ItineraryPreviewContent
              title={hook.formData.title || ctx.title}
              destination={ctx.destination || ctx.country_id || ''}
              startDate={ctx.start_date ?? null}
              outboundFlight={hook.formData.outboundFlight}
              returnFlight={hook.formData.returnFlight}
              dailyData={hook.getPreviewDailyData()}
              companyName={
                hook.currentUser?.workspace_name ||
                hook.currentUser?.workspace_code ||
                t('packageDialogTravelAgency')
              }
              isDomestic={hook.isDomestic}
              onEdit={() => hook.setViewMode('edit')}
              onPrint={hook.handlePrintPreview}
            />
          ) : (
            /* 編輯模式 */
            <div className="flex h-full max-h-[80vh]">
              {/* 左側：基本資訊 */}
              <div className="w-1/2 pr-6 border-r border-border overflow-y-auto">
                <DialogHeader className="mb-4">
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-morandi-gold" />
                    {hook.isEditMode ? t('packageDialogEditTitle') : t('packageDialogCreateTitle')}
                    <span className="text-sm font-normal text-morandi-secondary">
                      {ctx.version_name} - {ctx.title}
                    </span>
                    {/* 預覽按鈕 */}
                    <Button
                      variant="soft-gold"
                      size="sm"
                      onClick={() => hook.setViewMode('preview')}
                      className="ml-auto h-6 px-2 text-[0.588rem] gap-1"
                    >
                      <Eye size={10} />
                      {t('packageDialogPreview')}
                    </Button>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-morandi-primary">
                      {t('packageDialogItineraryTitleLabel')}
                    </Label>
                    <Input
                      value={hook.formData.title}
                      onChange={e => hook.setFormData({ ...hook.formData, title: e.target.value })}
                      placeholder={t('packageDialogItineraryTitlePlaceholder')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-morandi-primary">
                        {t('packageDialogDestinationLabel')}
                      </Label>
                      <Input
                        value={
                          ctx.country_id && ctx.airport_code
                            ? `${ctx.country_id} (${ctx.airport_code})`
                            : ctx.country_id || t('packageDialogNotSet')
                        }
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-morandi-primary">
                        {t('packageDialogDaysLabel')}
                      </Label>
                      <Input value={`${hook.calculateDays()} 天`} disabled className="bg-muted" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-morandi-primary">
                        {t('packageDialogDepartLabel')}
                      </Label>
                      <Input value={ctx.start_date || '(未設定)'} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-morandi-primary">
                        {t('packageDialogReturnLabel')}
                      </Label>
                      <Input value={ctx.end_date || '(未設定)'} disabled className="bg-muted" />
                    </div>
                  </div>

                  {/* 航班資訊（國內旅遊隱藏） */}
                  {!hook.isDomestic && (
                    <FlightSection
                      outboundFlight={hook.formData.outboundFlight}
                      outboundFlightNumber={hook.outboundFlightNumber}
                      outboundFlightDate={hook.outboundFlightDate}
                      searchingOutbound={hook.flightSearch.loadingOutboundFlight}
                      outboundSegments={hook.flightSearch.outboundSegments}
                      onOutboundFlightNumberChange={hook.setOutboundFlightNumber}
                      onOutboundFlightDateChange={hook.setOutboundFlightDate}
                      onSearchOutbound={hook.flightSearch.handleSearchOutboundFlight}
                      onSelectOutboundSegment={hook.flightSearch.handleSelectOutboundSegment}
                      onClearOutboundSegments={hook.flightSearch.clearOutboundSegments}
                      onRemoveOutbound={() =>
                        hook.setFormData(prev => ({ ...prev, outboundFlight: null }))
                      }
                      returnFlight={hook.formData.returnFlight}
                      returnFlightNumber={hook.returnFlightNumber}
                      returnFlightDate={hook.returnFlightDate}
                      searchingReturn={hook.flightSearch.loadingReturnFlight}
                      returnSegments={hook.flightSearch.returnSegments}
                      onReturnFlightNumberChange={hook.setReturnFlightNumber}
                      onReturnFlightDateChange={hook.setReturnFlightDate}
                      onSearchReturn={hook.flightSearch.handleSearchReturnFlight}
                      onSelectReturnSegment={hook.flightSearch.handleSelectReturnSegment}
                      onClearReturnSegments={hook.flightSearch.clearReturnSegments}
                      onRemoveReturn={() =>
                        hook.setFormData(prev => ({ ...prev, returnFlight: null }))
                      }
                      onManualOutbound={flight =>
                        hook.setFormData(prev => ({ ...prev, outboundFlight: flight }))
                      }
                      onManualReturn={flight =>
                        hook.setFormData(prev => ({ ...prev, returnFlight: flight }))
                      }
                      searchEnabled={flightSearchEnabled}
                    />
                  )}

                  {/* 錯誤訊息 */}
                  {hook.createError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-morandi-red/10 border border-morandi-red/30 text-morandi-red text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{hook.createError}</span>
                    </div>
                  )}

                  {/* 底部按鈕 */}
                  <div className="flex justify-between items-center pt-4 border-t border-border">
                    {/* 左側：版本選擇器 */}
                    <div className="flex items-center gap-2">
                      {hook.isEditMode && (
                        <VersionDropdown
                          existingItinerary={hook.existingItinerary}
                          versionRecords={hook.versionRecords}
                          selectedVersionIndex={hook.selectedVersionIndex}
                          currentVersionName={hook.getCurrentVersionName()}
                          onVersionChange={hook.handleVersionChange}
                        />
                      )}
                    </div>

                    {/* 右側：操作按鈕 */}
                    <div className="flex gap-1.5">
                      {hook.isEditMode && (
                        <Button
                          variant="soft-gold"
                          size="sm"
                          onClick={hook.handleSaveAsNewVersion}
                          disabled={hook.isCreating || !hook.formData.title.trim()}
                          className="h-7 px-2 text-[0.647rem] gap-1 border-morandi-gold text-morandi-gold hover:bg-morandi-gold/10"
                        >
                          <FilePlus size={12} />
                          {t('packageDialogSaveAsNew')}
                        </Button>
                      )}
                      <Button
                        variant="soft-gold"
                        size="sm"
                        onClick={hook.handleSubmit}
                        disabled={hook.isCreating || !hook.formData.title.trim()}
                        className="h-7 px-2 text-[0.647rem] gap-1"
                      >
                        {hook.isCreating ? <Spinner size="sm" /> : <Save className="w-3 h-3" />}
                        {hook.isEditMode ? t('packageDialogUpdate') : t('packageDialogCreate')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 右側：每日行程輸入 */}
              <div className="w-1/2 pl-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-morandi-primary">
                    {hook.isTimelineMode
                      ? t('packageDialogTimelineMode')
                      : t('packageDialogSimpleMode')}
                  </h3>
                  {/* 時間軸模式切換 */}
                  <Button
                    type="button"
                    variant={hook.isTimelineMode ? 'default' : 'soft-gold'}
                    size="xs"
                    className="rounded-full"
                    onClick={() => hook.setIsTimelineMode(!hook.isTimelineMode)}
                    title={
                      hook.isTimelineMode
                        ? t('packageDialogSwitchSimple')
                        : t('packageDialogSwitchTimeline')
                    }
                  >
                    <Clock size={12} />
                    <span>
                      {hook.isTimelineMode
                        ? t('packageDialogSimpleBtnText')
                        : t('packageDialogTimelineBtnText')}
                    </span>
                  </Button>
                </div>

                {/* 簡易模式 */}
                {!hook.isTimelineMode && (
                  <DailyScheduleEditor
                    dailySchedule={hook.dailySchedule}
                    startDate={ctx.start_date ?? null}
                    onUpdateDay={hook.updateDaySchedule}
                    getPreviousAccommodation={hook.getPreviousAccommodation}
                  />
                )}

                {/* 時間軸模式 */}
                {hook.isTimelineMode && (
                  <TimelineEditor
                    dailySchedule={hook.dailySchedule}
                    selectedDayIndex={hook.selectedDayIndex}
                    startDate={ctx.start_date ?? null}
                    tourCountryName={ctx.destination || ctx.country_id || ''}
                    onSelectDay={hook.setSelectedDayIndex}
                    onUpdateDay={hook.updateDaySchedule}
                    onAddActivity={hook.addActivity}
                    onRemoveActivity={hook.removeActivity}
                    onUpdateActivity={hook.updateActivity}
                    onAddActivitiesFromAttractions={hook.addActivitiesFromAttractions}
                    getPreviousAccommodation={hook.getPreviousAccommodation}
                  />
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
