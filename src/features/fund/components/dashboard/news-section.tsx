"use client"

import { useMemo } from "react"
import { NewsWidget } from "./news"
import type { NewsArticle } from "@fund/fund.types"

function usePortfolioNews(
  news: NewsArticle[],
  stocks: { ticker: string }[],
) {
  return useMemo(() => {
    const tickerSet = new Set(stocks.map((asset) => asset.ticker))
    return news.filter((article) =>
      article.tickers?.some((ticker) => tickerSet.has(ticker)),
    )
  }, [news, stocks])
}

type NewsSectionProps = {
  stocks: { ticker: string }[]
  news: NewsArticle[]
}

export function NewsSection({ stocks, news }: NewsSectionProps) {
  const portfolioNews = usePortfolioNews(news, stocks)

  return <NewsWidget allNews={news} portfolioNews={portfolioNews} />
}
