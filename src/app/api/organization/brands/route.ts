/**
 * /api/organization/brands — 品牌管理 CRUD
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

export const GET = apiHandler(() => listDimension('brands'))
export const POST = apiHandler((req: NextRequest) => createDimension('brands', req))
export const PUT = apiHandler((req: NextRequest) => updateDimension('brands', req))
export const DELETE = apiHandler((req: NextRequest) => deleteDimension('brands', req))
