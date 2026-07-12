"use client"

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistance } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { NewsArticle } from "@fund/fund.types"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { NewsItemSkeleton } from "@/components/skeletons/item"
import { useState } from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import StatusLabel from "@/components/status-label"
import { Clock, Newspaper } from "lucide-react"

type NewsWidgetProps = {
  allNews: NewsArticle[]
  portfolioNews: NewsArticle[]
}

function ArticleList({ articles }: { articles: NewsArticle[] }) {
  const now = new Date()

  if (articles.length == 0) return <StatusLabel type="empty" />

  return (
    <ItemGroup className="gap-2">
      {articles.map((article) => (
        <Item
          key={article.id}
          variant="muted"
          size="default"
          className="cursor-pointer hover:bg-accent transition-colors"
          onClick={() => window.open(article.url, "_blank")}
        >
          <ItemMedia>
            <Badge>{article.tickers && article.tickers[0]}</Badge>
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{article.title}</ItemTitle>
            <ItemDescription className="text-xs">
              {article.excerpt}
            </ItemDescription>
            <ItemDescription className="-ml-2">
              <Badge variant="ghost">
                <Newspaper />
                {article.source}
              </Badge>
              <Badge variant="ghost">
                <Clock />
                {now &&
                  formatDistance(new Date(article.published_at), now, {
                    addSuffix: true,
                  })}
              </Badge>
            </ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  )
}

export function NewsWidget({ allNews, portfolioNews }: NewsWidgetProps) {
  const [selected, setSelected] = useState<"all" | "portfolio">("all")
  const articles = selected === "all" ? allNews : portfolioNews

  return (
    <Card className="h-120">
      <CardHeader>
        <CardTitle>Market Pulse</CardTitle>
        <CardAction>
          <ToggleGroup
            type="single"
            variant="outline"
            value={selected}
            onValueChange={(value) => {
              if (value) setSelected(value as "all" | "portfolio")
            }}
            spacing={0}
          >
            <ToggleGroupItem value="all">All news</ToggleGroupItem>
            <ToggleGroupItem value="portfolio">Portfolio only</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <ScrollArea className="h-full w-full">
          <ArticleList articles={articles} />
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export function NewsSkeleton() {
  return (
    <Card className="h-120">
      <CardHeader>
        <CardTitle>Market Pulse</CardTitle>
        <CardAction>
          <Skeleton className="h-9 w-56 rounded-3xl" />
        </CardAction>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <NewsItemSkeleton />
        <NewsItemSkeleton />
        <NewsItemSkeleton />
        <NewsItemSkeleton />
        <NewsItemSkeleton />
      </CardContent>
    </Card>
  )
}
