import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { Database } from "@/types/database.types"

type ArticleRow =
  Database["public"]["Tables"]["news_articles"]["Row"] & {
    news_article_assets: {
      assets: {
        ticker: string | null
      }[]
    }[]
  }

export async function GET() {
  const supabase = await createClient()

  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const { data, error } = await supabase
    .from("news_articles")
    .select(`
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
    `)
    .gte("published_at", oneWeekAgo.toISOString())
    .order("published_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const typedData = data as ArticleRow[] | null

  const formatted =
    typedData?.map((article) => ({
      ...article,
      tickers:
        article.news_article_assets
          ?.flatMap((rel) =>
            rel.assets.map((a) => a.ticker)
          )
          .filter((t): t is string => Boolean(t)) ?? [],
    })) ?? []

  return NextResponse.json(formatted)
}