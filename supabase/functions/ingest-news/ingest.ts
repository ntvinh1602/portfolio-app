import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { NEWS_SOURCES, type NormalizedArticle } from "./sources.ts"
import { extractTickers } from "./utils.ts"

export async function ingestAllSources(supabase: SupabaseClient) {
  let totalInserted = 0

  for (const source of NEWS_SOURCES) {
    const feed = await source.parser.parseURL(source.url)

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)

    const normalized: NormalizedArticle[] = feed.items
      .map(source.mapItem)
      .filter((item): item is NormalizedArticle => {
        if (!item) return false
        if (item.published_at) {
          const published = new Date(item.published_at)
          if (published < cutoff) return false
        }
        return true
      })

    if (!normalized.length) continue

    const articleTickerMap = new Map<
      string,
      { article: NormalizedArticle; tickers: string[] }
    >()
    const allTickers = new Set<string>()

    for (const article of normalized) {
      const combined = `${article.title} ${article.excerpt}`
      const tickers = extractTickers(combined)

      if (tickers.length > 0) {
        articleTickerMap.set(article.url, { article, tickers })
        tickers.forEach((t) => allTickers.add(t))
      }
    }

    if (allTickers.size === 0) continue

    const { data: assets } = await supabase
      .from("assets")
      .select("id, ticker")
      .in("ticker", [...allTickers])
      .eq("asset_class", "stock")

    if (!assets?.length) continue

    const validTickers = new Set(assets.map((a: { id: string; ticker: string }) => a.ticker))

    const articlesWithTickers: { article: NormalizedArticle; tickers: string[] }[] = []

    for (const [url, { article, tickers }] of articleTickerMap.entries()) {
      const matched = tickers.filter((t) => validTickers.has(t))
      if (matched.length === 0) continue
      articlesWithTickers.push({ article, tickers: matched })
    }

    if (!articlesWithTickers.length) continue

    const upsertRows = articlesWithTickers.map(({ article, tickers }) => ({
      ...article,
      related_stocks: tickers,
    }))

    const { data: insertedArticles, error } = await supabase
      .from("news_articles")
      .upsert(upsertRows, { onConflict: "url" })
      .select("id")

    if (error || !insertedArticles?.length) continue

    totalInserted += insertedArticles.length
  }

  return { inserted: totalInserted }
}
