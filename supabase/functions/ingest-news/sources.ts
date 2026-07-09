import Parser from "https://esm.sh/rss-parser@3.13.0"
import he from "https://esm.sh/he@1.2.0"

export type NormalizedArticle = {
  title: string
  url: string
  published_at: string | null
  excerpt: string
  source: string
}

interface RssItem {
  title?: string
  link?: string
  guid?: string
  isoDate?: string
  contentSnippet?: string
  "content:encodedSnippet"?: string
  "content:encoded"?: string
}

interface CustomFields {
  item?: string[]
}

export type NewsSourceConfig = {
  name: string
  url: string
  parser: Parser
  mapItem: (item: RssItem) => NormalizedArticle | null
}

function createParser(customFields?: CustomFields) {
  return new Parser({ timeout: 10000, customFields })
}

export const NEWS_SOURCES: NewsSourceConfig[] = [
  {
    name: "VnEconomy",
    url: "https://vneconomy.vn/doanh-nghiep-niem-yet.rss",
    parser: createParser({ item: ["content:encodedSnippet"] }),
    mapItem: (item) => {
      const url = item.link ?? item.guid ?? null
      if (!url) return null
      return {
        title: he.decode(item.title ?? "").trim(),
        url,
        published_at: item.isoDate ?? null,
        excerpt: he.decode(
          item["content:encodedSnippet"] ?? item.contentSnippet ?? ""
        ).trim(),
        source: "VnEconomy",
      }
    },
  },
  {
    name: "Vietnambiz",
    url: "https://vietnambiz.vn/chung-khoan.rss",
    parser: createParser({
      item: ["content:encoded", "content:encodedSnippet"],
    }),
    mapItem: (item) => {
      const url = item.link ?? item.guid ?? null
      if (!url) return null
      return {
        title: he.decode(item.title ?? "").trim(),
        url,
        published_at: item.isoDate ?? null,
        excerpt: he.decode(
          item["content:encodedSnippet"] ?? item.contentSnippet ?? ""
        ).trim(),
        source: "Vietnambiz",
      }
    },
  },
]
