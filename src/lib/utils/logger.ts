/**
 * Enhanced Logger for Venturo ERP
 * 支援結構化日誌、遠端收集、多層級輸出
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  userId?: string
  workspaceId?: string
  tourId?: string
  requestId?: string
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  data?: unknown
  stack?: string
}

// 環境變數
const isDevelopment = process.env.NODE_ENV === 'development'
const isServer = typeof window === 'undefined'
const LOG_LEVEL = (process.env.NEXT_PUBLIC_LOG_LEVEL || 'info') as LogLevel
const REMOTE_LOGGING_ENABLED = process.env.NEXT_PUBLIC_REMOTE_LOGGING === 'true'

// PII redact: 生產環境強制遮蔽敏感欄位、開發保留原值方便 debug
// 敏感欄位 (完全遮蔽): password / token / secret / api_key 等
const PII_FULL_REDACT_REGEX =
  /^(password|password_hash|token|access_token|refresh_token|api_key|apikey|secret|authorization|bearer|session|cookie|credit_card)$/i
// 部分遮蔽: email / phone 保留前後可辨識、中間星號
const PII_PARTIAL_MASK_REGEX =
  /^(email|auth_email|user_email|phone|mobile|national_id|passport_no)$/i

function maskEmail(v: string): string {
  const [local, domain] = v.split('@')
  if (!domain) return '***'
  const prefix = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1)
  return `${prefix}***@${domain}`
}

function maskPartial(key: string, v: string): string {
  if (!v) return v
  if (/email/i.test(key)) return maskEmail(v)
  if (v.length < 4) return '***'
  return `***${v.slice(-4)}`
}

/**
 * 遞迴遮蔽 PII 欄位、回傳新物件不改動原值
 * 只在生產環境套用 (dev 保留原值方便 debug)
 */
function redactPII(data: unknown, depth = 0): unknown {
  if (depth > 10) return data // 防遞迴深度爆炸
  if (data === null || data === undefined) return data
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') return data
  if (Array.isArray(data)) return data.map(v => redactPII(v, depth + 1))
  if (typeof data !== 'object') return data
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (PII_FULL_REDACT_REGEX.test(k)) {
      out[k] = '***'
    } else if (PII_PARTIAL_MASK_REGEX.test(k) && typeof v === 'string') {
      out[k] = maskPartial(k, v)
    } else if (v && typeof v === 'object') {
      out[k] = redactPII(v, depth + 1)
    } else {
      out[k] = v
    }
  }
  return out
}

function maybeRedact<T>(data: T): T {
  if (isDevelopment) return data
  return redactPII(data) as T
}

// 日誌層級權重
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// 全域 context（可在 app 層級設定）
let globalContext: LogContext = {}

/**
 * 設定全域 context（通常在登入後設定）
 */
function _setLogContext(context: LogContext): void {
  globalContext = { ...globalContext, ...context }
}

/**
 * 清除全域 context（登出時呼叫）
 */
function _clearLogContext(): void {
  globalContext = {}
}

/**
 * 檢查是否應該輸出該層級的日誌
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[LOG_LEVEL]
}

/**
 * 建立結構化日誌條目
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  data?: unknown,
  context?: LogContext
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: maybeRedact({ ...globalContext, ...context }),
  }

  if (data !== undefined) {
    entry.data = maybeRedact(data)
  }

  if (data instanceof Error) {
    entry.stack = data.stack
    entry.data = {
      name: data.name,
      message: data.message,
    }
  }

  return entry
}

/**
 * 輸出到 console
 */
function normalizeErrorData(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data
  // Error / PostgrestError：欄位常為 non-enumerable，devtools 會顯示成 {}
  const d = data as Record<string, unknown>
  if (d instanceof Error || 'message' in d || 'code' in d || 'details' in d || 'hint' in d) {
    return {
      message: d.message,
      code: d.code,
      details: d.details,
      hint: d.hint,
      name: (d as { name?: unknown }).name,
      stack: (d as { stack?: unknown }).stack,
    }
  }
  return data
}

function writeToConsole(entry: LogEntry): void {
  // 在生產環境的瀏覽器中，只輸出 error
  if (!isDevelopment && !isServer && entry.level !== 'error') {
    return
  }

  // eslint-disable-next-line no-console -- logger 自身的 fallback、不是 debug 殘留
  const consoleMethod = console[entry.level] || console.log

  if (isDevelopment) {
    // 開發環境：格式化輸出
    const prefix = `[${entry.level.toUpperCase()}]`
    const contextStr =
      Object.keys(entry.context || {}).length > 0 ? ` ${JSON.stringify(entry.context)}` : ''

    if (entry.data) {
      consoleMethod(prefix, entry.message, normalizeErrorData(entry.data), contextStr)
    } else {
      consoleMethod(prefix, entry.message, contextStr)
    }

    if (entry.stack) {
      console.error(entry.stack)
    }
  } else {
    // 生產環境：JSON 格式（便於日誌收集）
    consoleMethod(JSON.stringify(entry))
  }
}

/**
 * 發送到遠端日誌收集器（非阻塞）
 */
async function sendToRemote(entry: LogEntry): Promise<void> {
  if (!REMOTE_LOGGING_ENABLED) return
  if (isServer) return // 目前只支援瀏覽器端發送

  try {
    // 使用 sendBeacon 確保日誌不會因頁面關閉而丟失
    const payload = JSON.stringify(entry)

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/log-error', payload)
    } else {
      // Fallback to fetch
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // 忽略發送失敗
      })
    }
  } catch {
    // 忽略錯誤，日誌系統本身不應該拋出錯誤
  }
}

/**
 * 解析日誌參數（向下相容舊的呼叫方式）
 * 舊: logger.log('message', arg1, arg2, arg3)
 * 新: logger.log('message', data, context)
 */
function parseLogArgs(args: unknown[]): [unknown, LogContext | undefined] {
  if (args.length === 0) {
    return [undefined, undefined]
  }

  if (args.length === 1) {
    // 單一參數，可能是 data 或 context
    const arg = args[0]
    if (isLogContext(arg)) {
      return [undefined, arg]
    }
    return [arg, undefined]
  }

  // 多個參數
  const lastArg = args[args.length - 1]
  if (isLogContext(lastArg)) {
    // 最後一個是 context
    return [args.length === 2 ? args[0] : args.slice(0, -1), lastArg]
  }

  // 沒有 context，全部當作 data
  return [args.length === 1 ? args[0] : args, undefined]
}

/**
 * 檢查是否為 LogContext
 */
function isLogContext(arg: unknown): arg is LogContext {
  if (typeof arg !== 'object' || arg === null) return false
  const keys = Object.keys(arg)
  // LogContext 通常包含這些 key
  const contextKeys = ['userId', 'workspaceId', 'tourId', 'requestId']
  return keys.some(k => contextKeys.includes(k))
}

/**
 * 核心日誌函數
 */
function logMessage(level: LogLevel, message: string, data?: unknown, context?: LogContext): void {
  if (!shouldLog(level)) return

  const entry = createLogEntry(level, message, data, context)

  writeToConsole(entry)

  // error 層級自動發送到遠端
  if (level === 'error') {
    sendToRemote(entry)
  }
}

/**
 * Logger 實例
 */
export const logger = {
  /**
   * Debug 層級日誌（僅開發環境）
   */
  debug: (message: string, ...args: unknown[]) => {
    const [data, context] = parseLogArgs(args)
    logMessage('debug', message, data, context)
  },

  /**
   * Info 層級日誌
   */
  info: (message: string, ...args: unknown[]) => {
    const [data, context] = parseLogArgs(args)
    logMessage('info', message, data, context)
  },

  /**
   * 一般日誌（等同 info）
   */
  log: (message: string, ...args: unknown[]) => {
    const [data, context] = parseLogArgs(args)
    logMessage('info', message, data, context)
  },

  /**
   * Warning 層級日誌
   */
  warn: (message: string, ...args: unknown[]) => {
    const [data, context] = parseLogArgs(args)
    logMessage('warn', message, data, context)
  },

  /**
   * Error 層級日誌（會自動發送到遠端）
   */
  error: (message: string, ...args: unknown[]) => {
    const [data, context] = parseLogArgs(args)
    logMessage('error', message, data, context)
  },

  /**
   * 建立帶有特定 context 的子 logger
   */
  child: (childContext: LogContext) => {
    return {
      debug: (message: string, data?: unknown) => logMessage('debug', message, data, childContext),
      info: (message: string, data?: unknown) => logMessage('info', message, data, childContext),
      log: (message: string, data?: unknown) => logMessage('info', message, data, childContext),
      warn: (message: string, data?: unknown) => logMessage('warn', message, data, childContext),
      error: (message: string, data?: unknown) => logMessage('error', message, data, childContext),
    }
  },

  /**
   * 計時工具
   */
  time: (label: string) => {
    const start = performance.now()
    return {
      end: (context?: LogContext) => {
        const duration = performance.now() - start
        logMessage('info', `${label} completed`, { duration: `${duration.toFixed(2)}ms` }, context)
        return duration
      },
    }
  },
}

// 向下相容：確保舊的呼叫方式仍然有效
// 舊: logger.log('message', data)
// 新: logger.log('message', data, context)
