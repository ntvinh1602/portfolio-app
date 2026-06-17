"use client"

import { useState, useMemo } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import {
  ToggleGroup,
  ToggleGroupItem
} from "@/components/ui/toggle-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { NewsArticle } from "@/types/news"

type NewsWidgetProps = {
  stockList: {
    ticker: string
  }[]
  news: NewsArticle[]
}

export function NewsWidget({
  stockList,
  news
}: NewsWidgetProps) {

  const [filter, setFilter] = useState<"all" | "related">("all")

  // Create a fast lookup set of holding tickers
  const holdingTickers = useMemo(() => {
    return new Set(stockList.map((s) => s.ticker))
  }, [stockList])

  // Filter logic
  const filteredArticles = useMemo(() => {
    if (!news) return []
    if (filter === "all") return news

    return news.filter((article) =>
      article.tickers?.some((ticker) =>
        holdingTickers.has(ticker)
      )
    )
  }, [news, filter, holdingTickers])

  return (
    <Card className="flex flex-col max-h-120">
      <CardHeader>
        <CardTitle>Latest News</CardTitle>
        <CardAction>
          <ToggleGroup
            type="single"
            value={filter}
            onValueChange={(val) => {
              if (val) setFilter(val as "all" | "related")
            }}
            spacing={1}
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="related">Portfolio</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>

      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="pr-3 pb-(--card-spacing)">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="group cursor-pointer rounded-md transition py-2"
                onClick={() => window.open(article.url, "_blank")}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm font-light leading-tight text-foreground/90 line-clamp-2 group-hover:text-primary">
                    {article.title}
                  </p>

                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    {article.tickers.slice(0, 1).map((ticker) => (
                      <Badge key={ticker}>{ticker}</Badge>
                    ))}
                    {article.tickers.length > 1 && (
                      <Badge>+{article.tickers.length - 1}</Badge>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(article.published_at), {
                      addSuffix: true,
                    })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {article.source}
                  </span>
                </div>
              </div>
            ))}

            {filteredArticles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No news available
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}