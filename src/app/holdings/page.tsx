"use client"

import {
  PageMain,
  PageHeader,
  PageContent,
} from "@/components/page-layout"
import { StockCardFull } from "@/components/cards/stock-full"
import { CryptoCardFull } from "@/components/cards/crypto-full"
import { BottomNavBar } from "@/components/menu/bottom-nav"

export default function Page() {
  return (
    <PageMain>
      <PageHeader title="Holdings" />
      <PageContent>
        <div className="flex flex-col gap-4">
          <StockCardFull />
          <CryptoCardFull />
        </div>
      </PageContent>
      <BottomNavBar />
    </PageMain>
  )
}