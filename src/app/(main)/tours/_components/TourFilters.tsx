'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { ResponsiveHeader } from '@/components/layout/responsive-header'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar, FileCheck, MapPin, Plus, FileText, Copy, PackageCheck } from 'lucide-react'
import { TOUR_FILTERS, TOUR_TAB } from '../_constants'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'

interface TourFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  activeTab: string
  onTabChange: (tab: string) => void
  onAddTour: () => void
  onAddProposal?: () => void
  onAddTemplate?: () => void
}

export const TourFilters: React.FC<TourFiltersProps> = ({
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  onAddTour,
  onAddProposal,
  onAddTemplate,
}) => {
  const t = useTranslations('tour')
  const { can } = useCapabilities()
  // 5/24：模板獨立成權限。沒有「可建立模板」能力的人、不顯示「開模板」選項。
  const canCreateTemplate = can(CAPABILITIES.TOURS_TEMPLATE_WRITE)
  const tabs = [
    { value: TOUR_TAB.IN_PROGRESS, label: TOUR_FILTERS.tab_in_progress, icon: Calendar },
    { value: TOUR_TAB.RETURNED, label: TOUR_FILTERS.tab_returned, icon: PackageCheck },
    { value: TOUR_TAB.CLOSED, label: TOUR_FILTERS.tab_closed, icon: FileCheck },
    { value: TOUR_TAB.PROPOSAL, label: TOUR_FILTERS.tab_proposals, icon: FileText },
    { value: TOUR_TAB.TEMPLATE, label: TOUR_FILTERS.tab_templates, icon: Copy },
  ]

  return (
    <ResponsiveHeader
      rootDataTutorial="tours-header"
      title={TOUR_FILTERS.page_title}
      icon={MapPin}
      breadcrumb={[{ label: TOUR_FILTERS.breadcrumb_tours, href: '/tours' }]}
      showSearch={true}
      searchTerm={searchQuery}
      onSearchChange={onSearchChange}
      searchPlaceholder={TOUR_FILTERS.search_placeholder}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      actions={
        // Dropdown trigger 不能塞進結構化 primaryAction、走 headerActions escape hatch、Trigger 用 header-outline 統一視覺
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="header-outline" size="sm" data-tutorial="tour-add-button">
              <Plus />
              {t('filterAddProject')}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAddTour}>
              <Calendar className="mr-2 h-4 w-4" />
              {t('filterOpenTour')}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onAddProposal}>
              <FileText className="mr-2 h-4 w-4" />
              {t('filterProposal')}
            </DropdownMenuItem>

            {canCreateTemplate && (
              <DropdownMenuItem onClick={onAddTemplate}>
                <Copy className="mr-2 h-4 w-4" />
                {t('filterOpenTemplate')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  )
}
