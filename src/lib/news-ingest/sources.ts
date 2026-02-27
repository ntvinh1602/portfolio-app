import Parser from "rss-parser"
import he from "he"

export type NormalizedArticle = {
  title: string
  url: string
  published_at: string | null
  excerpt: string
  source: string
}

export type NewsSourceConfig = {
  name: string
  url: string
  parser: Parser
  mapItem: (item: any) => NormalizedArticle | null
}

function createParser(customFields?: any) {
  return new Parser({
    timeout: 10000,
    customFields,
  })
}

export const NEWS_SOURCES: NewsSourceConfig[] = [
  {
    name: "VnEconomy",
    url: "https://vneconomy.vn/doanh-nghiep-niem-yet.rss",
    parser: createParser({
      item: ["content:encodedSnippet"],
    }),
    mapItem: (item) => {
      const url = item.link ?? item.guid ?? null
      if (!url) return null

      return {
        title: he.decode(item.title ?? "").trim(),
        url,
        published_at: item.isoDate ?? null,
        excerpt: he.decode(
          item["content:encodedSnippet"] ??
          item.contentSnippet ??
          ""
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
          item["content:encodedSnippet"] ??
          item.contentSnippet ??
          ""
        ).trim(),
        source: "Vietnambiz",
      }
    },
  },
]