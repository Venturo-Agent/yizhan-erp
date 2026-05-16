'use client'
/**
 * 行事曆設定 Dialog
 * 控制要顯示哪些類型的事件
 */

import { Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useCalendarStore } from '@/stores'
import { useTranslations } from 'next-intl'

export function CalendarSettingsDialog() {
  const t = useTranslations('calendarPage')
  const { settings, updateSettings } = useCalendarStore()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="header-outline" size="sm">
          <Settings size={16} />
          {t('settingsTitle')}
        </Button>
      </DialogTrigger>

      <DialogContent level={1} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settingsDialogTitle')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 個人行事曆 */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="show-personal"
              checked={settings.showPersonal}
              onCheckedChange={checked => updateSettings({ showPersonal: checked as boolean })}
            />
            <div className="space-y-0.5">
              <Label htmlFor="show-personal" className="text-base cursor-pointer">
                {t('settingsPersonalCalendar')}
              </Label>
              <p className="text-sm text-muted-foreground">{t('settingsPersonalCalendarHint')}</p>
            </div>
          </div>

          {/* 公司行事曆 */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="show-company"
              checked={settings.showCompany}
              onCheckedChange={checked => updateSettings({ showCompany: checked as boolean })}
            />
            <div className="space-y-0.5">
              <Label htmlFor="show-company" className="text-base cursor-pointer">
                {t('settingsCompanyCalendar')}
              </Label>
              <p className="text-sm text-muted-foreground">{t('settingsCompanyCalendarHint')}</p>
            </div>
          </div>

          {/* 旅遊團 */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="show-tours"
              checked={settings.showTours}
              onCheckedChange={checked => updateSettings({ showTours: checked as boolean })}
            />
            <div className="space-y-0.5">
              <Label htmlFor="show-tours" className="text-base cursor-pointer">
                {t('settingsTours')}
              </Label>
              <p className="text-sm text-muted-foreground">{t('settingsToursHint')}</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground border-t border-border pt-4">
          {t('settingsBirthdayHint')}
        </div>
      </DialogContent>
    </Dialog>
  )
}
