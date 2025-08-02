import {
  Card,
  CardContent,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Image from 'next/image'
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { formatNum } from "@/lib/utils"

interface TransactionCardProps {
  date: string;
  type: string;
  description: string;
  ticker: string;
  name: string;
  logoUrl: string;
  quantity: number;
  amount: number;
  currencyCode: string;
  netSold?: number
}

function TransactionCard( { date, type, description, ticker, name, logoUrl, quantity, amount, currencyCode, netSold }: TransactionCardProps) {

  const primaryValue =
    type === "sell" && netSold !== undefined
      ? formatNum(netSold)
      : type === "split"
        ? `${formatNum(quantity)} units`
        : formatNum(amount);

  const secondaryValue =
    currencyCode === 'VND'
      ? undefined // If VND, secondaryValue is undefined (no value)
      : currencyCode === 'BTC'
        ? formatNum(quantity, 6, currencyCode) // If not VND, but BTC, format with 6 decimal places
        : formatNum(quantity, 2, currencyCode); // If not VND and not BTC, format with 2 decimal places


  return (
    <Card className="bg-card/0 gap-1 py-0 border-none">
      <CardTitle className="text-sm font-thin">
        {format(new Date(date), "EEEE, dd MMMM yyyy")}
      </CardTitle>
      <CardContent className="flex items-center text-sm font-thin border-t py-2 px-0 gap-2">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={name}
            width={36}
            height={36}
            className="rounded-full object-contain"
          />
        ) : (
          <div className="h-9 w-9 flex-shrink-0 rounded-full bg-primary flex items-center justify-center">
            <span className="text-xs text-primary-foreground">{ticker}</span>
          </div>
        )}
        <div className="flex flex-col w-full min-w-0 gap-1 pl-2">
          <div className="flex flex-1 text-foreground justify-between min-w-0">
            <span className=" truncate min-w-0 ">
              {description}
            </span>
            <span className="flex-shrink-0 pl-2 whitespace-nowrap">
              {primaryValue}
            </span>
          </div>
          <div className="flex flex-1 justify-between min-w-0 items-end">
            <div className="flex gap-1">
              <Badge variant="outline" className="capitalize">
                {type}
              </Badge>
              <Badge variant="outline">
                {ticker}
              </Badge>
            </div>
            <span className="text-xs flex-shrink-0 pl-2 whitespace-nowrap">
              {secondaryValue}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TransactionSkeleton() {
  return (
    <Card className="gap-1 py-0 border-none bg-card/0 shadow-none">
      <Skeleton className="h-5 w-24" />
      <CardContent className="flex items-center border-t py-2 px-0 gap-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex flex-col w-full min-w-0 gap-1">
          <div className="flex flex-1 justify-between min-w-0">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-1/6" />
          </div>
          <div className="flex flex-1 justify-between min-w-0 items-end">
            <div className="flex gap-1">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-5 w-1/5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export {
  TransactionCard,
  TransactionSkeleton
}