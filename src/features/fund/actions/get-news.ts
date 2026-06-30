import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import type { NewsArticle } from "@fund/fund.types"

export default async function getNews() {
  "use cache: private"
  cacheTag("news")
  cacheLife("days")

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("news_articles")
    .select("id, title, url, source, excerpt, published_at, related_stocks")
    .order("published_at", { ascending: false })

  if (error) {
    console.error("NEWS FETCH ERROR:", error)
    throw new Error(error.message)
  }

  return (data?.map((article) => ({
    ...article,
    tickers: article.related_stocks ?? [],
  })) ?? []) as NewsArticle[]
}
