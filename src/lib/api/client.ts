import { logger } from '@/lib/utils/logger'

export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
    public path: string
  ) {
    super(`API ${status} ${statusText} ${path}`)
    this.name = 'HttpError'
  }
}

export interface ApiOptions {
  signal?: AbortSignal
  headers?: Record<string, string>
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

async function request<TResponse = unknown>(
  method: Method,
  path: string,
  body?: unknown,
  options: ApiOptions = {}
): Promise<TResponse> {
  const hasBody = body !== undefined
  const init: RequestInit = {
    method,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    signal: options.signal,
  }
  if (hasBody) {
    init.body = JSON.stringify(body)
  }

  let res: Response
  try {
    res = await fetch(path, init)
  } catch (err) {
    logger.error(`API ${method} ${path} 網路錯誤:`, err)
    throw err
  }

  if (!res.ok) {
    let parsed: unknown
    try {
      parsed = await res.json()
    } catch (jsonErr) {
      logger.warn(`API ${method} ${path} 回應 JSON 解析失敗、改讀 text:`, jsonErr)
      parsed = await res.text().catch(() => null)
    }
    logger.error(`API ${method} ${path} ${res.status}:`, parsed)
    throw new HttpError(res.status, res.statusText, parsed, path)
  }

  if (res.status === 204) return undefined as TResponse

  const text = await res.text()
  if (!text) return undefined as TResponse
  try {
    return JSON.parse(text) as TResponse
  } catch (jsonErr) {
    logger.warn(`API ${method} ${path} JSON.parse 失敗、回傳 raw text:`, jsonErr)
    return text as TResponse
  }
}

export function apiGet<T = unknown>(path: string, options?: ApiOptions): Promise<T> {
  return request<T>('GET', path, undefined, options)
}

export function apiPost<T = unknown>(
  path: string,
  body?: unknown,
  options?: ApiOptions
): Promise<T> {
  return request<T>('POST', path, body, options)
}

export function apiPut<T = unknown>(
  path: string,
  body?: unknown,
  options?: ApiOptions
): Promise<T> {
  return request<T>('PUT', path, body, options)
}

export function apiPatch<T = unknown>(
  path: string,
  body?: unknown,
  options?: ApiOptions
): Promise<T> {
  return request<T>('PATCH', path, body, options)
}

export function apiDelete<T = unknown>(path: string, options?: ApiOptions): Promise<T> {
  return request<T>('DELETE', path, undefined, options)
}

export function extractHttpErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpError) {
    const body = err.body as { error?: string; message?: string } | null
    if (body?.error) return body.error
    if (body?.message) return body.message
  }
  return fallback
}
