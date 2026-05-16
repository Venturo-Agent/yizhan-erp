/**
 * /api/organization/departments — 部門管理 CRUD
 * onboarding fix pack 2026-05-10
 */

import { NextRequest } from 'next/server'
import {
  listDimension,
  createDimension,
  updateDimension,
  deleteDimension,
} from '../_helpers'
import { apiHandler } from '@/lib/api/api-handler'

export const GET = apiHandler(() => listDimension('departments'))
export const POST = apiHandler((req: NextRequest) => createDimension('departments', req))
export const PUT = apiHandler((req: NextRequest) => updateDimension('departments', req))
export const DELETE = apiHandler((req: NextRequest) => deleteDimension('departments', req))
