"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

export type NewsArticle = {
  id: string
  title: string
  url: string
  source: string
  excerpt: string
  published_at: string
  created_at: string
  tickers: string[]
}

export function useNews() {
  const fetchNews = async (): Promise<NewsArticle[]> => {
    const supabase = createClient()

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
      .order("published_at", { ascending: false })

    if (error) throw new Error(error.message)

    return (
      data?.map((article: any) => ({
        ...article,
        tickers:
          article.news_article_assets?.map(
            (rel: any) => rel.assets.ticker
          ) ?? [],
      })) ?? []
    )
  }

  const { data, error, isLoading, mutate } = useSWR(
    "newsData",
    fetchNews,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return {
    data: data ?? [],
    isLoading,
    error,
    mutate,
  }
}