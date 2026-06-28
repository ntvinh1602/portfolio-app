const TICKER_RE = /(?<!\.)\b[A-Z]{3}\b/g

export function extractTickers(text: string): string[] {
  const matches = text.match(TICKER_RE)
  if (!matches) return []
  return [...new Set(matches)]
}
