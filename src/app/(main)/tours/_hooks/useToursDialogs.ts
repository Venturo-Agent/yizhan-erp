'use client'

import { useState, useCallback } from 'react'
import { Tour } from '@/stores/types'
import { ArchiveReason } from '../_components/ArchiveReasonDialog'

interface DialogState<T = Tour | null> {
  isOpen: boolean
  tour: T
}

interface UseToursDialogsReturn {
  // Itinerary Dialog (for design)
  itineraryDialogTour: Tour | null
  openItineraryDialog: (tour: Tour) => void
  closeItineraryDialog: () => void

  // Tour Itinerary Dialog (for selecting itinerary type)
  tourItineraryDialogTour: Tour | null
  openTourItineraryDialog: (tour: Tour) => void
  closeTourItineraryDialog: () => void

  // Archive Dialog
  archiveDialogTour: Tour | null
  isArchiving: boolean
  openArchiveDialog: (tour: Tour) => void
  closeArchiveDialog: () => void
  confirmArchive: (
    reason: ArchiveReason,
    onArchive: (tour: Tour, reason: ArchiveReason) => void | Promise<void>
  ) => Promise<void>

  // Confirmation Wizard
  confirmWizardTour: Tour | null
  openConfirmWizard: (tour: Tour) => void
  closeConfirmWizard: () => void

  // Unlock Dialog
  unlockDialogTour: Tour | null
  openUnlockDialog: (tour: Tour) => void
  closeUnlockDialog: () => void

  // Delete Confirm Dialog
  deleteConfirm: DialogState
  openDeleteDialog: (tour: Tour) => void
  closeDeleteDialog: () => void
}

export function useToursDialogs(): UseToursDialogsReturn {
  // Itinerary Dialog (for design)
  const [itineraryDialogTour, setItineraryDialogTour] = useState<Tour | null>(null)

  // Tour Itinerary Dialog (for selecting itinerary type)
  const [tourItineraryDialogTour, setTourItineraryDialogTour] = useState<Tour | null>(null)

  // Archive Dialog
  const [archiveDialogTour, setArchiveDialogTour] = useState<Tour | null>(null)
  // 防連點：封存提交中
  const [isArchiving, setIsArchiving] = useState(false)

  // Confirmation Wizard
  const [confirmWizardTour, setConfirmWizardTour] = useState<Tour | null>(null)

  // Unlock Dialog
  const [unlockDialogTour, setUnlockDialogTour] = useState<Tour | null>(null)

  // Delete Confirm Dialog
  const [deleteConfirm, setDeleteConfirm] = useState<DialogState>({
    isOpen: false,
    tour: null,
  })

  // Handlers
  const openItineraryDialog = useCallback((tour: Tour) => setItineraryDialogTour(tour), [])
  const closeItineraryDialog = useCallback(() => setItineraryDialogTour(null), [])

  const openTourItineraryDialog = useCallback((tour: Tour) => setTourItineraryDialogTour(tour), [])
  const closeTourItineraryDialog = useCallback(() => setTourItineraryDialogTour(null), [])

  const openArchiveDialog = useCallback((tour: Tour) => setArchiveDialogTour(tour), [])
  const closeArchiveDialog = useCallback(() => setArchiveDialogTour(null), [])
  const confirmArchive = useCallback(
    async (
      reason: ArchiveReason,
      onArchive: (tour: Tour, reason: ArchiveReason) => void | Promise<void>
    ) => {
      if (!archiveDialogTour || isArchiving) return
      setIsArchiving(true)
      try {
        await onArchive(archiveDialogTour, reason)
        setArchiveDialogTour(null)
      } finally {
        setIsArchiving(false)
      }
    },
    [archiveDialogTour, isArchiving]
  )

  const openConfirmWizard = useCallback((tour: Tour) => setConfirmWizardTour(tour), [])
  const closeConfirmWizard = useCallback(() => setConfirmWizardTour(null), [])

  const openUnlockDialog = useCallback((tour: Tour) => setUnlockDialogTour(tour), [])
  const closeUnlockDialog = useCallback(() => setUnlockDialogTour(null), [])

  const openDeleteDialog = useCallback((tour: Tour) => {
    setDeleteConfirm({ isOpen: true, tour })
  }, [])
  const closeDeleteDialog = useCallback(() => {
    setDeleteConfirm({ isOpen: false, tour: null })
  }, [])

  return {
    itineraryDialogTour,
    openItineraryDialog,
    closeItineraryDialog,
    tourItineraryDialogTour,
    openTourItineraryDialog,
    closeTourItineraryDialog,
    archiveDialogTour,
    isArchiving,
    openArchiveDialog,
    closeArchiveDialog,
    confirmArchive,
    confirmWizardTour,
    openConfirmWizard,
    closeConfirmWizard,
    unlockDialogTour,
    openUnlockDialog,
    closeUnlockDialog,
    deleteConfirm,
    openDeleteDialog,
    closeDeleteDialog,
  }
}
