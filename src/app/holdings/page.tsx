"use client";

import {
  PageMain,
  PageHeader,
  PageContent,
} from "@/components/page-layout";
import { StockCardFull } from "@/components/cards/stock-full";
import { CryptoCardFull } from "@/components/cards/crypto-full";
import { BottomNavBar } from "@/components/menu/bottom-nav";
import { useHoldings } from "@/hooks/useHoldings";
import { SecuritySkeleton } from "@/components/list-item/security";

export default function Page() {
  const { stockHoldings, cryptoHoldings, loading } = useHoldings();

  return (
    <PageMain>
      <PageHeader title="Holdings" />
      <PageContent>
        <div className="flex flex-col gap-4">
          {loading ? (
            <>
              <SecuritySkeleton />
              <SecuritySkeleton />
            </>
          ) : (
            <>
              <StockCardFull stockHoldings={stockHoldings} />
              <CryptoCardFull cryptoHoldings={cryptoHoldings} />
            </>
          )}
        </div>
      </PageContent>
      <BottomNavBar />
    </PageMain>
  );
}