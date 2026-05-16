/**
 * /api/organization/branches — 分公司管理 CRUD
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

export const GET = apiHandler(() => listDimension('branches'))
export const POST = apiHandler((req: NextRequest) => createDimension('branches', req))
export const PUT = apiHandler((req: NextRequest) => updateDimension('branches', req))
export const DELETE = apiHandler((req: NextRequest) => deleteDimension('branches', req))
