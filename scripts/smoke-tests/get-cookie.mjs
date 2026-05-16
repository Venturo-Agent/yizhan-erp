// Helper: 用 supabase ssr 模擬 server-side login、輸出 cookie 給 curl
import { createServerClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const email = process.env.SMOKE_EMAIL
const password = process.env.SMOKE_PASSWORD

const cookies = []
const supabase = createServerClient(url, anon, {
  cookies: {
    getAll() { return cookies },
    setAll(toSet) {
      for (const c of toSet) cookies.push({ name: c.name, value: c.value, options: c.options })
    },
  },
})

const { data, error } = await supabase.auth.signInWithPassword({ email, password })
if (error) {
  console.error('login error:', error.message)
  process.exit(1)
}

const map = new Map()
for (const c of cookies) map.set(c.name, c.value)
const lines = []
for (const [name, value] of map) lines.push(`${name}=${value}`)
console.log(lines.join('; '))
