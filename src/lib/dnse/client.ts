import { createHmac, randomUUID } from "crypto"

const DEFAULT_DNSE_BASE_URL = "https://openapi.dnse.com.vn"
const DEFAULT_DNSE_API_VERSION = "2026-05-07"
const DEFAULT_DATE_HEADER = "Date"

type DnseMethod = "GET" | "POST" | "PUT" | "DELETE"

interface RequestDnseOptions {
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  headers?: Record<string, string>
}

interface DnseConfig {
  apiKey: string
  apiSecret: string
  baseUrl: string
  apiVersion: string
  dateHeaderName: string
}

interface DnseErrorPayload {
  code?: string
  message?: string
  status?: number
}

export class DnseConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DnseConfigError"
  }
}

export class DnseApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = "DnseApiError"
    this.status = status
    this.code = code
  }
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new DnseConfigError(`Missing required DNSE environment variable: ${name}`)
  }

  return value
}

function getDnseConfig(): DnseConfig {
  return {
    apiKey: getRequiredEnv("DNSE_API_KEY"),
    apiSecret: getRequiredEnv("DNSE_API_SECRET"),
    baseUrl: process.env.DNSE_API_BASE_URL ?? DEFAULT_DNSE_BASE_URL,
    apiVersion: process.env.DNSE_API_VERSION ?? DEFAULT_DNSE_API_VERSION,
    dateHeaderName: DEFAULT_DATE_HEADER,
  }
}

function formatDateHeader(date = new Date()): string {
  return date.toUTCString().replace("GMT", "+0000")
}

function buildSignatureHeader(
  config: DnseConfig,
  method: DnseMethod,
  path: string,
  dateValue: string
) {
  const nonce = randomUUID().replace(/-/g, "")
  const headerKey = config.dateHeaderName.toLowerCase()
  const headersList = `(request-target) ${headerKey}`
  const signatureString = [
    `(request-target): ${method.toLowerCase()} ${path}`,
    `${headerKey}: ${dateValue}`,
    `nonce: ${nonce}`,
  ].join("\n")

  const signature = encodeURIComponent(
    createHmac("sha256", Buffer.from(config.apiSecret, "utf8"))
      .update(signatureString, "utf8")
      .digest("base64")
  )

  const value = [
    `Signature keyId="${config.apiKey}"`,
    'algorithm="hmac-sha256"',
    `headers="${headersList}"`,
    `signature="${signature}"`,
    `nonce="${nonce}"`,
  ].join(",")

  return value
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>
) {
  const url = new URL(path, baseUrl)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    }
  }

  return url
}

function parseErrorPayload(payload: unknown): DnseErrorPayload | null {
  if (!payload || typeof payload !== "object") {
    return null
  }

  const candidate = payload as DnseErrorPayload
  return candidate
}

export async function requestDnse<T>(
  method: DnseMethod,
  path: string,
  options: RequestDnseOptions = {}
): Promise<T> {
  const config = getDnseConfig()
  const url = buildUrl(config.baseUrl, path, options.query)
  const dateValue = formatDateHeader()
  const signatureHeader = buildSignatureHeader(config, method, path, dateValue)

  const headers = new Headers({
    Accept: "application/json",
    [config.dateHeaderName]: dateValue,
    "X-API-Key": config.apiKey,
    "X-Signature": signatureHeader,
    version: config.apiVersion,
  })

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json")
  }

  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      headers.set(key, value)
    }
  }

  const response = await fetch(url, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  })

  const text = await response.text()
  const payload = text ? tryParseJson(text) : null

  if (!response.ok) {
    const errorPayload = parseErrorPayload(payload)
    throw new DnseApiError(
      errorPayload?.message ?? `DNSE request failed with status ${response.status}`,
      response.status,
      errorPayload?.code
    )
  }

  return payload as T
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
