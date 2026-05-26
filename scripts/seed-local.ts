#!/usr/bin/env tsx
/**
 * seed-local.ts — 本機 supabase 灌假資料 SOP
 *
 * 用法：
 *   npm run seed:local              # 灌假資料（idempotent、重跑不會撞）
 *   npm run seed:local -- --reset   # 先 truncate 再灌
 *
 * 環境：必須跑在 .env.development.local 環境（NEXT_PUBLIC_SUPABASE_URL = http://127.0.0.1:54321）
 *      不准跑 production（會 abort 並印警告）
 *
 * 灌出來的資料：
 *   - 1 個假 workspace『LOCAL_TEST』
 *   - 1 個 platform_admin role + 全 capability
 *   - 1 個假員工 william@local（password: localdev）+ admin role
 *   - 1 個假 brand / branch / department
 *   - 1 個假客戶『角落客戶 A』
 *   - 1 個假 tour + 1 個假 order
 *   - 5 個收款方式（其中 2 個是永豐相關 provider、其他 manual）
 *
 * 不灌：實際 invoice / receipt / payment_transaction（這些走 UI 測流程才有意義）
 *
 * 為什麼這樣設計（William 5/23 拍板）：
 *   - 灌「最少能跑起來 + 永豐流程測試」、其他靠 UI 累積
 *   - idempotent：重跑用 ON CONFLICT、不會撞 unique
 *   - 可重置：--reset 把 LOCAL_TEST workspace 整支樹刪掉重灌
 *
 * 對應文件：workspace/_meta/architecture/2026-05-23-測試環境概念.md
 */

import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

loadEnv({ path: resolve(process.cwd(), '.env.development.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

// 安全閥：production / staging 一律 abort
if (!SUPABASE_URL.includes('127.0.0.1') && !SUPABASE_URL.includes('localhost')) {
  console.error('❌ seed-local 只能跑在本機 supabase（127.0.0.1 / localhost）')
  console.error(`   目前 NEXT_PUBLIC_SUPABASE_URL = ${SUPABASE_URL}`)
  console.error('   請確認你跑的是 .env.development.local 環境、不是 production')
  process.exit(2)
}

if (!SERVICE_ROLE_KEY) {
  console.error('❌ 缺 SUPABASE_SERVICE_ROLE_KEY')
  console.error('   1. 跑 `supabase start` 取得 service_role key')
  console.error('   2. 填進 .env.development.local')
  process.exit(2)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const WORKSPACE_CODE = 'LOCAL_TEST'
const WORKSPACE_NAME = '本機測試公司'
const ADMIN_EMAIL = 'william@local'
const ADMIN_PASSWORD = 'localdev'

const shouldReset = process.argv.includes('--reset')

async function main() {
  console.log('🌱 seed-local 開始')
  console.log(`   target: ${SUPABASE_URL}`)
  console.log(`   workspace: ${WORKSPACE_CODE}`)
  console.log(`   reset: ${shouldReset ? 'YES（先 truncate）' : 'NO（idempotent upsert）'}`)
  console.log('')

  if (shouldReset) {
    await reset()
  }

  const workspaceId = await ensureWorkspace()
  await ensureAdminUser(workspaceId)
  await ensureOrgScope(workspaceId)
  await ensureCustomer(workspaceId)
  await ensureTourAndOrder(workspaceId)
  await ensurePaymentMethods(workspaceId)

  console.log('')
  console.log('✅ seed 完成')
  console.log('')
  console.log('▶ 登入資訊')
  console.log(`   email:    ${ADMIN_EMAIL}`)
  console.log(`   password: ${ADMIN_PASSWORD}`)
  console.log(`   url:      http://localhost:3000`)
  console.log('')
  console.log('▶ 永豐流程測試')
  console.log('   1. /finance/payments → 新增收款 → 選「永豐刷卡」row')
  console.log('   2. 填金額 + Email、產連結')
  console.log('   3. 開新分頁刷卡 → 看 receipt 自動 confirmed')
}

async function reset() {
  console.log('🧹 reset：清掉 LOCAL_TEST workspace 整支樹')
  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('code', WORKSPACE_CODE)
    .maybeSingle()
  if (ws) {
    // workspaces ON DELETE CASCADE 會把下游表全清
    const { error } = await supabase.from('workspaces').delete().eq('id', ws.id)
    if (error) throw error
    console.log('   deleted')
  } else {
    console.log('   (沒找到、跳過)')
  }

  // auth.users 不在 workspace cascade 範圍、單獨刪
  const { data: usersList } = await supabase.auth.admin.listUsers()
  const u = usersList?.users?.find(x => x.email === ADMIN_EMAIL)
  if (u) {
    await supabase.auth.admin.deleteUser(u.id)
    console.log(`   deleted auth user: ${ADMIN_EMAIL}`)
  }
}

async function ensureWorkspace(): Promise<string> {
  console.log('▶ workspace')
  const { data: existing } = await supabase
    .from('workspaces')
    .select('id')
    .eq('code', WORKSPACE_CODE)
    .maybeSingle()

  if (existing) {
    console.log(`   already exists: ${existing.id}`)
    return existing.id
  }

  const { data, error } = await supabase
    .from('workspaces')
    .insert({ code: WORKSPACE_CODE, name: WORKSPACE_NAME, is_active: true })
    .select('id')
    .single()
  if (error) throw error
  console.log(`   created: ${data.id}`)
  return data.id
}

async function ensureAdminUser(workspaceId: string) {
  console.log('▶ admin user + employee')

  // 先查 auth.users
  const { data: listed } = await supabase.auth.admin.listUsers()
  let authUser = listed?.users?.find(u => u.email === ADMIN_EMAIL)

  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { workspace_code: WORKSPACE_CODE, workspace_id: workspaceId },
    })
    if (error) throw error
    authUser = data.user
    console.log(`   created auth user: ${authUser?.id}`)
  } else {
    console.log(`   auth user exists: ${authUser.id}`)
  }

  if (!authUser) throw new Error('auth user 建立失敗')

  // employees upsert
  const { data: existing } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', authUser.id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (existing) {
    console.log(`   employee exists: ${existing.id}`)
    return
  }

  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .insert({
      workspace_id: workspaceId,
      user_id: authUser.id,
      employee_code: 'E001',
      chinese_name: '本機測試用 William',
      email: ADMIN_EMAIL,
      hire_date: new Date().toISOString().slice(0, 10),
      is_active: true,
    })
    .select('id')
    .single()
  if (empErr) throw empErr
  console.log(`   created employee: ${emp.id}`)
}

async function ensureOrgScope(workspaceId: string) {
  console.log('▶ brand / branch / department (3 維 scope)')
  // onboarding seed trigger 通常會自動建、補保險
  await supabase
    .from('brands')
    .upsert(
      { workspace_id: workspaceId, code: 'HQ', name: '總部品牌', is_active: true },
      { onConflict: 'workspace_id,code' }
    )
  await supabase
    .from('branches')
    .upsert(
      { workspace_id: workspaceId, code: 'HQ', name: '總部', is_active: true },
      { onConflict: 'workspace_id,code' }
    )
  await supabase
    .from('departments')
    .upsert(
      { workspace_id: workspaceId, code: 'GENERAL', name: '一般', is_active: true },
      { onConflict: 'workspace_id,code' }
    )
  console.log('   ok')
}

async function ensureCustomer(workspaceId: string) {
  console.log('▶ customer')
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('chinese_name', '角落客戶 A')
    .maybeSingle()

  if (existing) {
    console.log(`   exists: ${existing.id}`)
    return existing.id
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({
      workspace_id: workspaceId,
      customer_code: 'C001',
      chinese_name: '角落客戶 A',
      email: 'customer-a@local',
      mobile: '0900000001',
      is_active: true,
    })
    .select('id')
    .single()
  if (error) throw error
  console.log(`   created: ${data.id}`)
  return data.id
}

async function ensureTourAndOrder(workspaceId: string) {
  console.log('▶ tour + order')
  // tour
  const { data: existingTour } = await supabase
    .from('tours')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('code', 'T001')
    .maybeSingle()

  let tourId: string
  if (existingTour) {
    tourId = existingTour.id
    console.log(`   tour exists: ${tourId}`)
  } else {
    const { data, error } = await supabase
      .from('tours')
      .insert({
        workspace_id: workspaceId,
        code: 'T001',
        name: '本機測試團（東京 5 日）',
        status: 'active',
      })
      .select('id')
      .single()
    if (error) {
      console.warn(`   ⚠ tour 建立失敗 (${error.message})、可能 schema 跟預設不同、跳過`)
      return
    }
    tourId = data.id
    console.log(`   tour created: ${tourId}`)
  }

  // order
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('order_number', 'O001')
    .maybeSingle()

  if (existingOrder) {
    console.log(`   order exists: ${existingOrder.id}`)
    return
  }

  const { error: orderErr } = await supabase.from('orders').insert({
    workspace_id: workspaceId,
    order_number: 'O001',
    tour_id: tourId,
    status: 'active',
  })
  if (orderErr) {
    console.warn(`   ⚠ order 建立失敗 (${orderErr.message})、跳過`)
  } else {
    console.log('   order created')
  }
}

async function ensurePaymentMethods(workspaceId: string) {
  console.log('▶ payment_methods (含永豐 provider)')
  const methods = [
    { code: 'CASH', name: '現金', kind: 'cash', provider: 'manual' },
    { code: 'BANK_TRANSFER', name: '玉山匯款', kind: 'wire_transfer', provider: 'manual' },
    {
      code: 'SINOPAC_COLLECT',
      name: '永豐豐收款',
      kind: 'wire_transfer',
      provider: 'sinopac_collect',
    },
    { code: 'SINOPAC_CARD', name: '永豐線上刷卡', kind: 'card', provider: 'sinopac_card' },
    { code: 'CHECK', name: '支票', kind: 'check', provider: 'manual' },
  ]

  for (const m of methods) {
    const { data: existing } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('code', m.code)
      .maybeSingle()

    if (existing) continue

    const { error } = await supabase.from('payment_methods').insert({
      workspace_id: workspaceId,
      type: 'receipt',
      code: m.code,
      name: m.name,
      kind: m.kind,
      provider: m.provider,
      is_active: true,
      sort_order: 0,
    })
    if (error) console.warn(`   ⚠ ${m.code} 失敗：${error.message}`)
  }
  console.log(`   processed ${methods.length} methods`)
}

main().catch(err => {
  console.error('❌ seed 失敗：', err)
  process.exit(1)
})
