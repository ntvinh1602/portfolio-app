import { supabaseAdmin } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const { data, error } = await supabaseAdmin
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
    console.error("NEWS API ERROR:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const formatted =
    data?.map((article) => ({
      ...article,
      tickers:
        article.news_article_assets
          ?.map((rel) => rel.assets?.ticker)
          .filter((t): t is string => Boolean(t)) ?? [],
    })) ?? []

  return NextResponse.json(formatted)
}