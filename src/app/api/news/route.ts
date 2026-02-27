import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

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

  const formatted =
    data?.map((article: any) => ({
      ...article,
      tickers:
        article.news_article_assets?.map(
          (rel: any) => rel.assets.ticker
        ) ?? [],
    })) ?? []

  return NextResponse.json(formatted)
}