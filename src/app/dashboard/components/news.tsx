"use client"

import { useState, useMemo } from "react"
import { useNews } from "@/hooks/useNews"
import { useHoldingData } from "@/hooks/useHoldingData"
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

export function NewsWidget() {
  const { data: articles } = useNews()
  const { data: holdings } = useHoldingData()

  const [filter, setFilter] = useState<"all" | "related">("related")

  // Create a fast lookup set of holding tickers
  const holdingTickers = useMemo(() => {
    return new Set(holdings.map((h) => h.ticker))
  }, [holdings])

  // Filter logic
  const filteredArticles = useMemo(() => {
    if (filter === "all") return articles

    return articles.filter((article) =>
      article.tickers.some((ticker) =>
        holdingTickers.has(ticker)
      )
    )
  }, [articles, filter, holdingTickers])

  // Show only the 6 latest after filtering
  const latest = filteredArticles.slice(0, 6)

  return (
    <Card variant="glow" className="min-h-130">
      <CardHeader>
        <CardTitle className="text-lg">Latest News</CardTitle>
        <CardAction>
          <ToggleGroup
            type="single"
            value={filter}
            onValueChange={(val) => {
              if (val) setFilter(val as "all" | "related")
            }}
            variant="outline"
            className="self-end [&_[data-state=on]]:bg-primary/10 [&_[data-state=on]]:text-primary"
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="related">Portfolio</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {latest.map((article) => (
          <div
            key={article.id}
            className="group cursor-pointer rounded-md transition py-2"
            onClick={() => window.open(article.url, "_blank")}
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-light leading-tight line-clamp-2 group-hover:text-primary">
                {article.title}
              </p>

              <div className="flex gap-1 flex-shrink-0 ml-2">
                {article.tickers.slice(0, 1).map((ticker) => (
                  <Badge
                    key={ticker}
                    variant="default"
                    className="text-[10px] px-1"
                  >
                    {ticker}
                  </Badge>
                ))}
                {article.tickers.length > 1 && (
                  <Badge
                    variant="default"
                    className="text-[10px] px-1"
                  >
                    +{article.tickers.length - 1}
                  </Badge>
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

        {latest.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No news available
          </p>
        )}
      </CardContent>
    </Card>
  )
}