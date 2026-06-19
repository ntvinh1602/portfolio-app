"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistance } from "date-fns"
import {
  ToggleGroup,
  ToggleGroupItem
} from "@/components/ui/toggle-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { NewsArticle } from "@/types/news"
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { FileXCorner } from "lucide-react"

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
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

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
        <CardTitle>What's going on?</CardTitle>
        <CardDescription>Market news in the last 7 days</CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            variant="outline"
            value={filter}
            onValueChange={(val) => {
              if (val) setFilter(val as "all" | "related")
            }}
            spacing={0}
          >
            <ToggleGroupItem value="all">All news</ToggleGroupItem>
            <ToggleGroupItem value="related">Holdings</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>

      <CardContent className="flex-1 min-h-0">
        {filteredArticles.length === 0 ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileXCorner />
              </EmptyMedia>
              <EmptyTitle>No articles</EmptyTitle>
              <EmptyDescription>
                No articles available from the last 7 days.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ScrollArea className="h-full">
            <ItemGroup>
              {filteredArticles.map((article) => (
                <Item
                  key={article.id}
                  variant="muted"
                  size="xs"
                  className="cursor-pointer hover:border-ring transition-colors"
                  onClick={() => window.open(article.url, "_blank")}
                >
                  <ItemMedia className="flex flex-col gap-1 min-w-10">
                    {article.tickers.slice(0, 1).map((ticker) => (
                      <Badge key={ticker}>
                        {ticker}
                        
                      </Badge>
                    ))}
                    {article.tickers.length > 1 && (
                      <span className="text-xs">+{article.tickers.length - 1}</span>
                    )}
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{article.title}</ItemTitle>
                    <ItemDescription className="text-xs">
                      
                      {article.source} - {now ? formatDistance(new Date(article.published_at), now, { addSuffix: true }) : ""}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}