import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import type { NewsArticle } from "@fund/fund.types"

export default async function getNews() {
  "use cache: private"
  cacheTag("news")
  cacheLife("days")

  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("news_articles")
    .select(
      `
      id,
      title,
      url,
      source,
      excerpt,
      published_at,
      created_at,
      news_article_assets (
        assets (
          ticker
        )
      )
    `,
    )
    .gte("published_at", oneWeekAgo.toISOString())
    .order("published_at", { ascending: false })

  if (error) {
    console.error("NEWS FETCH ERROR:", error)
    throw new Error(error.message)
  }

  return (data?.map((article) => ({
    ...article,
    tickers:
      article.news_article_assets
        ?.map((rel: any) => rel.assets?.ticker)
        .filter((t: any): t is string => Boolean(t)) ?? [],
  })) ?? []) as NewsArticle[]
}
