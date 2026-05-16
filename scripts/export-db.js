const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const TABLES = [
  'payment_requests',
  'payment_request_items',
  'receipts',
  'orders',
  'order_members',
  'customers',
  'tours',
  'quotes',
  'itineraries',
  'tour_itinerary_days',
  'tour_itinerary_items',
  'disbursement_orders',
  'workspace_bank_accounts',
  'employees',
  'profiles',
  'workspaces',
  'workspace_members',
  'workspace_roles',
  'role_tab_permissions',
  'calendar_events',
  'todos',
  'suppliers',
  'places',
  'api_usage',
]

const OUTPUT_DIR = path.join(__dirname, '..', 'db-export')

async function exportTable(tableName) {
  console.log(`📦 Exporting ${tableName}...`)
  const allData = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
      console.error(`  ❌ ${tableName}: ${error.message}`)
      return
    }

    if (!data || data.length === 0) break

    allData.push(...data)
    console.log(`  📄 Page ${page + 1}: ${data.length} rows (total: ${allData.length})`)

    if (data.length < pageSize) break
    page++

    // Rate limit protection
    if (page % 5 === 0) await new Promise(r => setTimeout(r, 500))
  }

  // Save as JSON
  const jsonPath = path.join(OUTPUT_DIR, `${tableName}.json`)
  fs.writeFileSync(jsonPath, JSON.stringify(allData, null, 2))

  // Save as CSV (if has data)
  if (allData.length > 0) {
    const headers = Object.keys(allData[0])
    const csvRows = [
      headers.join(','),
      ...allData.map(row =>
        headers.map(h => {
          const val = row[h]
          if (val === null) return ''
          if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`
          const str = String(val)
          if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        }).join(',')
      )
    ]
    const csvPath = path.join(OUTPUT_DIR, `${tableName}.csv`)
    fs.writeFileSync(csvPath, csvRows.join('\n'))
  }

  console.log(`  ✅ ${tableName}: ${allData.length} rows exported`)
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  console.log('🔌 Connecting to Supabase...')
  console.log(`📁 Output: ${OUTPUT_DIR}\n`)

  for (const table of TABLES) {
    await exportTable(table)
    console.log('')
  }

  console.log('\n🎉 All done!')
  console.log(`📂 Files in: ${OUTPUT_DIR}`)
}

main().catch(console.error)
