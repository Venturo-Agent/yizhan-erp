/**
 * Distributed rate limiter using Supabase PostgreSQL
 * Falls back to in-memory Map if Supabase is unavailable
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

// In-memory fallback（Supabase 連不上時使用）
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

/**
 * Check rate limit using Supabase (distributed, cross-instance)
 */
async function rateLimitDistributed(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    const adminClient = getSupabaseAdminClient() as unknown as SupabaseClient
    const { data, error } = await adminClient.rpc('check_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })

    if (error) {
      logger.warn('Rate limit RPC error, falling back to in-memory:', error.message)
      return rateLimitInMemory(key, limit, windowSeconds * 1000)
    }

    return data as boolean
  } catch {
    // Supabase 連不上，使用 in-memory fallback
    return rateLimitInMemory(key, limit, windowSeconds * 1000)
  }
}

/**
 * In-memory rate limit fallback
 */
function rateLimitInMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= limit) return false
  record.count++
  return true
}

/**
 * Get client IP from request headers
 */
function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Helper: check rate limit and return 429 response if exceeded
 * Returns null if allowed, Response if rate limited
 */
export async function checkRateLimit(
  request: Request,
  route: string,
  limit: number = 10,
  windowMs: number = 60_000
): Promise<Response | null> {
  const ip = getClientIp(request)
  const key = `${route}:${ip}`
  const windowSeconds = Math.ceil(windowMs / 1000)

  const allowed = await rateLimitDistributed(key, limit, windowSeconds)

  if (!allowed) {
    return Response.json(
      { success: false, error: '請求過於頻繁，請稍後再試', code: 'RATE_LIMITED' },
      { status: 429 }
    )
  }

  return null
}
