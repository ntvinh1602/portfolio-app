import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import Image from 'next/image'
import {
  ReceiptText,
  ChartCandlestick
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StockCardProps {
  ticker: string;
  name: string;
  logoUrl: string;
  totalAmount: string;
  quantity: string;
  pnl: string;
  price: string;
  priceStatus?: 'loading' | 'error' | 'success';
}

export function StockCard({ ticker, name, logoUrl, totalAmount, quantity, pnl, price, priceStatus }: StockCardProps) {
  const pnlValue = pnl !== "..." ? parseFloat(pnl) : NaN;

  return (
    <Card className="rounded-full py-2 bg-background shadow-none">
      <CardContent className="flex items-center gap-3 px-3">
        <Image
          src={logoUrl}
          alt="Company Logo"
          width={56}
          height={56}
          className="rounded-full object-contain"
        />
        <div className="flex justify-between w-full items-center">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1 max-w-[150px]">
              <CardTitle>{ticker}</CardTitle>
              <CardDescription className="text-xs truncate">
                {name}
              </CardDescription>
            </div>
            <CardDescription className="flex items-center gap-1 truncate">
              <Badge
                variant="outline"
                className="rounded-full bg-sidebar"
              >
                <ReceiptText />{quantity}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full flex items-center gap-1.5 bg-sidebar"
              >
                <ChartCandlestick />
                {priceStatus === 'loading' ? '...' : price}
                {priceStatus && (
                  <span
                    className={`h-2 w-2 rounded-full ${
                      priceStatus === 'loading' ? 'bg-yellow-400 animate-pulse' :
                      priceStatus === 'success' ? 'bg-green-500' :
                      'bg-red-500'
                    }`}
                  />
                )}
              </Badge>
            </CardDescription>
          </div>
          <div className="flex flex-col justify-end gap-1 px-4">
            <CardTitle className="text-right text-sm">
              {totalAmount}
            </CardTitle>
            <CardDescription className="flex items-center justify-end">
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full flex items-center gap-1.5",
                  isNaN(pnlValue)
                    ? "bg-sidebar"
                    : pnlValue >= 0
                      ? "text-green-700 dark:text-green-400"
                      : "text-red-700 dark:text-red-400"
                )}
              >
                {pnl === "..." ? pnl : <>{pnl}%</>}
              </Badge>
            </CardDescription>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}