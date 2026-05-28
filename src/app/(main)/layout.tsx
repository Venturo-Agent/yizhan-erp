'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { ModuleGuard } from '@/components/guards/ModuleGuard'
import { ImagePreloader } from '@/components/layout/image-preloader'
import { TourProvider } from '@/components/tour/TourProvider'
import React from 'react'

export default function MainRouteGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <TourProvider>
      <MainLayout>
        <ImagePreloader />
        <ModuleGuard>{children}</ModuleGuard>
      </MainLayout>
    </TourProvider>
  )
}
