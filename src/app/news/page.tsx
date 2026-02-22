"use client"

import { useNews } from "@/hooks/useNews"
import { Header } from "@/components/header"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

function truncate(text: string, length = 400) {
  return text.length > length
    ? text.slice(0, length) + "..."
    : text
}

export default function NewsPage() {
  const { data: articles } = useNews()

  return (
    <div className="flex flex-col h-svh overflow-hidden">
      <Header title="News" />
      <Separator/>
      <ScrollArea className="flex flex-1 min-h-0 w-6/10 mt-4 mx-auto">
        <div className="flex flex-col gap-2">
          {articles.map((article) => (
            <Card
              key={article.id}
              className="cursor-pointer transition hover:bg-primary/10 hover:border-primary backdrop-blur-sm shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-px before:bg-gradient-to-r before:from-transparent before:via-ring/40 before:to-transparent"
              onClick={() => window.open(article.url, "_blank")}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{article.title}</CardTitle>
                    <CardDescription>
                      {formatDistanceToNow(new Date(article.published_at), {
                        addSuffix: true,
                      })}
                    </CardDescription>
                  </div>

                  <CardAction>
                    <div className="flex gap-2 flex-wrap justify-end items-center">
                      {article.tickers.slice(0, 2).map((ticker) => (
                        <Badge key={ticker} variant="default">
                          {ticker}
                        </Badge>
                      ))}

                      {article.tickers.length > 2 && (
                        <Badge variant="default">
                          +{article.tickers.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </CardAction>
                </div>
              </CardHeader>

              <CardContent>
                <p className="font-light text-sm">
                  {truncate(article.excerpt)}
                </p>
              </CardContent>

              <CardFooter>
                <Badge variant="outline">{article.source}</Badge>
              </CardFooter>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}