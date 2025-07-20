"use client"

import {
  PageMain,
  PageHeader,
  PageContent,
} from "@/components/page-layout"
import { StockCardFull } from "@/components/cards/stock-full"
import { BottomNavBar } from "@/components/menu/bottom-nav"

export default function Page() {
  return (
    <PageMain>
      <PageHeader title="Holdings" />
      <PageContent>
        <StockCardFull />
      </PageContent>
      <BottomNavBar />
    </PageMain>
  )
}