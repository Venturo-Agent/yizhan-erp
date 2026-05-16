// Amadeus TOTP — QR 解析工具（otpauth-migration protobuf + otpauth URI）

import jsQR from 'jsqr'

const QR_LABELS = {
  ERR_PARSE_IMAGE: '無法解析圖片',
  ERR_NO_QR: '找不到 QR code，請確認截圖清晰',
  ERR_QR_PARSE_FAILED: 'QR 內容解析失敗',
  ERR_QR_NO_SECRET: 'QR 缺少 secret',
  ERR_QR_FORMAT_UNSUPPORTED: 'QR 格式不支援（請用 Google Authenticator 匯出）',
} as const

export interface ParsedQr {
  secret: string
  accountName?: string
}

export async function parseQrFile(file: File): Promise<ParsedQr> {
  const dataUrl = await readFileAsDataUrl(file)
  const img = await loadImage(dataUrl)

  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error(QR_LABELS.ERR_PARSE_IMAGE)
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const qr = jsQR(imageData.data, imageData.width, imageData.height)
  if (!qr) throw new Error(QR_LABELS.ERR_NO_QR)

  return parseOtpUri(qr.data)
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function parseOtpUri(uri: string): ParsedQr {
  const migMatch = uri.match(/otpauth-migration:\/\/offline\?data=(.+)/)
  if (migMatch) {
    const raw = atob(decodeURIComponent(migMatch[1]))
    const bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
    const result = parseMigrationPayload(bytes)
    if (!result) throw new Error(QR_LABELS.ERR_QR_PARSE_FAILED)
    return result
  }

  const otpMatch = uri.match(/otpauth:\/\/totp\/(.+?)\?(.+)/)
  if (otpMatch) {
    const label = decodeURIComponent(otpMatch[1])
    const params = new URLSearchParams(otpMatch[2])
    const secret = params.get('secret')
    if (!secret) throw new Error(QR_LABELS.ERR_QR_NO_SECRET)
    return { secret, accountName: label }
  }

  throw new Error(QR_LABELS.ERR_QR_FORMAT_UNSUPPORTED)
}

function parseMigrationPayload(data: Uint8Array): ParsedQr | null {
  let i = 0
  while (i < data.length) {
    const tag = data[i++]
    const fieldNum = tag >> 3
    const wireType = tag & 0x07

    if (wireType === 2) {
      const { value, next } = readLengthDelimited(data, i)
      i = next
      if (fieldNum === 1) {
        const result = parseOtpParams(value)
        if (result) return result
      }
    } else if (wireType === 0) {
      while (data[i] & 0x80) i++
      i++
    } else {
      break
    }
  }
  return null
}

function parseOtpParams(data: Uint8Array): ParsedQr | null {
  let secret: string | null = null
  let name: string | null = null
  let i = 0

  while (i < data.length) {
    const tag = data[i++]
    const fieldNum = tag >> 3
    const wireType = tag & 0x07

    if (wireType === 2) {
      const { value, next } = readLengthDelimited(data, i)
      i = next
      if (fieldNum === 1) {
        secret = bytesToBase32(value)
      } else if (fieldNum === 2) {
        name = new TextDecoder().decode(value)
      }
    } else if (wireType === 0) {
      while (data[i] & 0x80) i++
      i++
    } else {
      break
    }
  }

  if (secret) return { secret, accountName: name || undefined }
  return null
}

function readLengthDelimited(data: Uint8Array, start: number): { value: Uint8Array; next: number } {
  let len = 0
  let shift = 0
  let b: number
  let i = start
  do {
    b = data[i++]
    len |= (b & 0x7f) << shift
    shift += 7
  } while (b & 0x80)
  return { value: data.slice(i, i + len), next: i + len }
}

function bytesToBase32(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0')
  let out = ''
  for (let j = 0; j + 5 <= bits.length; j += 5) {
    out += alphabet[parseInt(bits.slice(j, j + 5), 2)]
  }
  return out
}
