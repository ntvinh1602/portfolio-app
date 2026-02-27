"use client"

import { useState, useMemo } from "react"
import { useNews } from "@/hooks/useNews"
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
import { useDashboard } from "@/hooks"
import { ScrollArea } from "@/components/ui/scroll-area"

export function NewsWidget() {
  const { data: articles } = useNews()
  const { data: dashboard } = useDashboard()

  const [filter, setFilter] = useState<"all" | "related">("all")

  // Create a fast lookup set of holding tickers
  const holdingTickers = useMemo(() => {
    if (!dashboard?.stock_list) return new Set<string>()
    return new Set(dashboard.stock_list.map((s) => s.ticker))
  }, [dashboard])

  // Filter logic
  const filteredArticles = useMemo(() => {
    if (!articles) return []
    if (filter === "all") return articles

    return articles.filter((article) =>
      article.tickers?.some((ticker) =>
        holdingTickers.has(ticker)
      )
    )
  }, [articles, filter, holdingTickers])

  return (
    <Card className="relative flex flex-col gap-4 h-full 
      backdrop-blur-sm shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-px before:bg-gradient-to-r before:from-transparent before:via-ring/40 before:to-transparent">
      <CardHeader>
        <CardTitle className="text-lg font-normal">Latest News</CardTitle>
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

      <CardContent className="flex flex-col flex-1 min-h-0 gap-3">
        <ScrollArea className="flex-1 min-h-0">
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
                  <Badge
                    key={ticker}
                    className="bg-primary/10 border-primary/20"
                  >
                    {ticker}
                  </Badge>
                ))}
                {article.tickers.length > 1 && (
                  <Badge className="bg-primary/10 border-primary/20">
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

        {filteredArticles.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No news available
          </p>
        )}

        </ScrollArea>
      </CardContent>
    </Card>
  )
}