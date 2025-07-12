"use client"

import {
  PageMain,
  PageHeader,
  PageContent
} from "@/components/page-layout"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { StockCardFull } from "@/components/cards/stock-full"

export default function Page() {
  return (
    <PageMain>
      <PageHeader title="Holdings" />
      <PageContent>
        <StockCardFull />
        <Card>
          <CardHeader>
            <CardTitle>Crypto</CardTitle>
            <CardDescription>
              To the moon!
            </CardDescription>
        </CardHeader>
        </Card>
      </PageContent>
    </PageMain>
  )
}