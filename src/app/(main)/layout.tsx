'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { ModuleGuard } from '@/components/guards/ModuleGuard'
import React from 'react'

export default function MainRouteGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <MainLayout>
      <ModuleGuard>{children}</ModuleGuard>
    </MainLayout>
  )
}
