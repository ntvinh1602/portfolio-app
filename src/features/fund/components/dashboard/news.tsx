"use client"

import { useMemo } from "react"
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
import type { Asset } from "@fund/fund.types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import StatusLabel from "@/components/status-label"

function ArticleList({ articles }: { articles: NewsArticle[] }) {
  const now = new Date()
  return (
    <ItemGroup>
      {articles.map((article) => (
        <Item
          key={article.id}
          variant="muted"
          size="sm"
          className="cursor-pointer hover:bg-accent transition-colors"
          onClick={() => window.open(article.url, "_blank")}
        >
          <ItemMedia className="flex flex-col gap-1 min-w-10">
            {(article.tickers ?? []).slice(0, 1).map((ticker) => (
              <Badge key={ticker}>{ticker}</Badge>
            ))}
            {(article.tickers?.length ?? 0) > 1 && (
              <span className="text-xs">+{article.tickers!.length - 1}</span>
            )}
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{article.title}</ItemTitle>
            <ItemDescription className="text-xs">
              {article.excerpt}
            </ItemDescription>
            <ItemDescription className="text-xs">
              {article.source} -{" "}
              {now &&
                formatDistance(new Date(article.published_at), now, {
                  addSuffix: true,
                })}
            </ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  )
}

type NewsWidgetProps = {
  holdings: Asset[]
  news: NewsArticle[]
}

export function NewsWidget({ holdings, news }: NewsWidgetProps) {
  // Create a fast lookup set of stock holding tickers from the balance sheet
  const holdingTickers = useMemo(() => {
    return new Set(
      holdings
        .filter((asset) => asset.asset_class === "stock")
        .map((asset) => asset.ticker),
    )
  }, [holdings])

  // Filter logic
  const filteredArticles = useMemo(() => {
    return news.filter((article) =>
      article.tickers?.some((ticker) => holdingTickers.has(ticker)),
    )
  }, [news, holdingTickers])

  const tabs = [
    { value: "all", label: "All news", articles: news },
    {
      value: "portfolio",
      label: "Portfolio related",
      articles: filteredArticles,
    },
  ]

  return (
    <Tabs defaultValue="all">
      <Card className="max-h-120">
        <CardHeader>
          <CardTitle>Market Pulse</CardTitle>
          <CardAction>
            <TabsList className="w-fit rounded-3xl">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-2xl"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </CardAction>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          {filteredArticles.length === 0 ? (
            <StatusLabel type="empty"/>
          ) : (
            <ScrollArea className="h-full">
              {tabs.map((tab) => (
                <TabsContent key={tab.value} value={tab.value}>
                  <ArticleList articles={tab.articles} />
                </TabsContent>
              ))}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </Tabs>
  )
}
