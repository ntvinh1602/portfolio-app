import { createClient } from "@supabase/supabase-js"
import { NEWS_SOURCES } from "./sources"
import { NormalizedArticle } from "./sources"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function extractTickers(text: string): string[] {
  const matches = text.match(/(?<!\.)\b[A-Z]{3}\b/g)
  if (!matches) return []
  return [...new Set(matches)]
}

export async function ingestAllSources() {
  let totalInserted = 0
  let totalLinked = 0

  for (const source of NEWS_SOURCES) {
    const feed = await source.parser.parseURL(source.url)

    const normalized: NormalizedArticle[] = feed.items
      .map(source.mapItem)
      .filter(
        (item): item is NormalizedArticle => item !== null
      )

    if (!normalized.length) continue

    // 1️⃣ Extract tickers first
    const articleTickerMap = new Map<
      string,
      { article: any; tickers: string[] }
    >()

    const allTickers = new Set<string>()

    for (const article of normalized) {
      const combined = `${article.title} ${article.excerpt}`
      const tickers = extractTickers(combined)

      if (tickers.length > 0) {
        articleTickerMap.set(article.url, {
          article,
          tickers,
        })
        tickers.forEach((t) => allTickers.add(t))
      }
    }

    if (allTickers.size === 0) continue

    // 2️⃣ Validate tickers against assets
    const { data: assets } = await supabase
      .from("assets")
      .select("id, ticker")
      .in("ticker", [...allTickers])
      .eq("asset_class", "stock")

    if (!assets?.length) continue

    const tickerToAssetId = new Map<string, string>()
    for (const asset of assets) {
      tickerToAssetId.set(asset.ticker, asset.id)
    }

    // 3️⃣ Filter articles that have at least one VALID ticker
    const validArticles: any[] = []
    const relations: { article_url: string; asset_id: string }[] = []

    for (const [url, { article, tickers }] of articleTickerMap.entries()) {
      const matchedAssetIds = tickers
        .map((t) => tickerToAssetId.get(t))
        .filter(Boolean) as string[]

      if (matchedAssetIds.length === 0) continue

      validArticles.push(article)

      for (const assetId of matchedAssetIds) {
        relations.push({
          article_url: url,
          asset_id: assetId,
        })
      }
    }

    if (!validArticles.length) continue

    // 4️⃣ Upsert only matched articles
    const { data: insertedArticles, error } = await supabase
      .from("news_articles")
      .upsert(validArticles, { onConflict: "url" })
      .select("id, url")

    if (error || !insertedArticles?.length) continue

    totalInserted += insertedArticles.length

    const urlToId = new Map<string, string>()
    for (const article of insertedArticles) {
      urlToId.set(article.url, article.id)
    }

    // 5️⃣ Build relation rows using article IDs
    const relationRows: { article_id: string; asset_id: string }[] = []

    for (const relation of relations) {
      const articleId = urlToId.get(relation.article_url)
      if (!articleId) continue

      relationRows.push({
        article_id: articleId,
        asset_id: relation.asset_id,
      })
    }

    if (relationRows.length > 0) {
      const { error: relationError } = await supabase
        .from("news_article_assets")
        .upsert(relationRows, {
          onConflict: "article_id,asset_id",
        })

      if (!relationError) {
        totalLinked += relationRows.length
      }
    }
  }

  return {
    inserted: totalInserted,
    linked: totalLinked,
  }
}