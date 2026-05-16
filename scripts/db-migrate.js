#!/usr/bin/env node
/**
 * Venturo Database Migration Tool
 *
 * 這個腳本會自動執行未執行的 migration 檔案
 * 使用 Supabase Management API，確保在任何電腦上都能正常工作
 *
 * 使用方式：
 *   node scripts/db-migrate.js
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ 請設定 SUPABASE_ACCESS_TOKEN')
  process.exit(1)
}
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF
if (!PROJECT_REF) {
  console.error('❌ 請設定 SUPABASE_PROJECT_REF（在 .env.local 或環境變數）')
  process.exit(1)
}
const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations')

/**
 * 執行 SQL 查詢
 */
async function executeSQL(sql, description = 'SQL') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }

    const postData = JSON.stringify({ query: sql })

    const req = https.request(options, res => {
      let data = ''

      res.on('data', chunk => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✅ ${description} 執行成功`)
          resolve({ success: true, data })
        } else {
          console.error(`❌ ${description} 執行失敗 (${res.statusCode})`)
          console.error('回應:', data)
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', error => {
      console.error(`❌ 網路錯誤:`, error.message)
      reject(error)
    })

    req.write(postData)
    req.end()
  })
}

/**
 * 檢查 migration 記錄表是否存在
 * SSOT: supabase_migrations.schema_migrations (Supabase CLI 標準)
 */
async function ensureMigrationTable() {
  // supabase_migrations.schema_migrations 由 Supabase 平台自動建立、無需手動 CREATE。
  // 這裡只驗證可讀取。
  const sql = `SELECT 1 FROM supabase_migrations.schema_migrations LIMIT 1;`
  try {
    await executeSQL(sql, '驗證 schema_migrations 可讀')
    return true
  } catch (error) {
    console.error('無法存取 supabase_migrations.schema_migrations:', error.message)
    return false
  }
}

/**
 * 取得已執行的 migrations（回傳 filename 清單，例如 20260101000000_xxx.sql）
 * 從 schema_migrations.version + name 還原 filename
 */
async function getExecutedMigrations() {
  const sql = `SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;`

  try {
    const result = await executeSQL(sql, '查詢已執行的 migrations')
    const data = JSON.parse(result.data)
    return data.map(row => `${row.version}_${row.name}.sql`)
  } catch (error) {
    console.warn('⚠️ 無法查詢 migrations，可能是第一次執行')
    return []
  }
}

/**
 * 記錄已執行的 migration
 * filename 格式：YYYYMMDDHHMMSS_description.sql
 */
async function recordMigration(name) {
  const m = name.match(/^(\d{14})_(.+)\.sql$/)
  if (!m) {
    throw new Error(`Migration filename 格式錯誤（需 YYYYMMDDHHMMSS_xxx.sql）: ${name}`)
  }
  const version = m[1]
  const baseName = m[2].replace(/'/g, "''")
  const sql = `INSERT INTO supabase_migrations.schema_migrations (version, name, statements) VALUES ('${version}', '${baseName}', ARRAY[]::text[]) ON CONFLICT (version) DO NOTHING;`
  await executeSQL(sql, `記錄 migration: ${name}`)
}

/**
 * 讀取所有 migration 檔案
 */
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('⚠️ migrations 目錄不存在')
    return []
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort()
}

/**
 * 主執行函數
 */
async function main() {
  console.log('🔄 Venturo Database Migration Tool\n')
  console.log(`📂 Migrations 目錄: ${MIGRATIONS_DIR}`)
  console.log(`🗄️  Project: ${PROJECT_REF}\n`)

  // 1. 確保 migration 記錄表存在
  const tableCreated = await ensureMigrationTable()
  if (!tableCreated) {
    console.error('\n❌ 無法建立 migration 記錄表，請檢查權限')
    process.exit(1)
  }

  // 2. 取得已執行的 migrations
  const executedMigrations = await getExecutedMigrations()
  console.log(`\n📊 已執行的 migrations: ${executedMigrations.length} 個`)
  if (executedMigrations.length > 0) {
    executedMigrations.forEach(name => console.log(`  ✓ ${name}`))
  }

  // 3. 取得所有 migration 檔案
  const allMigrations = getMigrationFiles()
  console.log(`\n📋 Migration 檔案總數: ${allMigrations.length} 個`)

  // 4. 找出未執行的 migrations
  const pendingMigrations = allMigrations.filter(file => !executedMigrations.includes(file))

  if (pendingMigrations.length === 0) {
    console.log('\n✅ 所有 migrations 都已執行，資料庫是最新狀態！')
    process.exit(0)
  }

  console.log(`\n🔄 待執行的 migrations: ${pendingMigrations.length} 個`)
  pendingMigrations.forEach(name => console.log(`  • ${name}`))

  // 5. 執行未執行的 migrations
  let successCount = 0
  let failCount = 0

  for (const migrationFile of pendingMigrations) {
    console.log(`\n📝 執行: ${migrationFile}`)

    const filePath = path.join(MIGRATIONS_DIR, migrationFile)
    const sql = fs.readFileSync(filePath, 'utf8')

    try {
      await executeSQL(sql, migrationFile)
      await recordMigration(migrationFile)
      successCount++
    } catch (error) {
      console.error(`❌ Migration 失敗:`, error.message)
      failCount++
      // 遇到錯誤時停止執行後續 migrations
      break
    }
  }

  // 6. 顯示結果
  console.log('\n' + '='.repeat(50))
  console.log(`✅ 成功: ${successCount} 個`)
  console.log(`❌ 失敗: ${failCount} 個`)

  if (failCount > 0) {
    console.log('\n⚠️ 部分 migration 執行失敗，請檢查錯誤訊息')
    process.exit(1)
  } else {
    console.log('\n🎉 所有 migrations 執行完成！')
    process.exit(0)
  }
}

// 執行主函數
main().catch(error => {
  console.error('\n❌ 執行錯誤:', error.message)
  process.exit(1)
})
