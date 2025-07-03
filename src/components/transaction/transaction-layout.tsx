import {
  Card,
  CardContent,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Image from 'next/image'
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

interface TransactionCardProps {
  ticker: string;
  name: string;
  logoUrl: string;
  amount: string;
  quantity: string;
  type: string;
  description: string;
  currencyCode: string;
  transactionDate: string;
}

function TransactionCard( { ticker, name, logoUrl, amount, quantity, type, description, currencyCode, transactionDate }: TransactionCardProps) {
  return (
    <Card className="gap-1 py-0 border-none bg-background shadow-none">
      <CardTitle className="text-sm font-normal">
        {format(new Date(transactionDate), "dd MMM yyyy")}
      </CardTitle>
      <CardContent className="flex items-center border-t py-2 px-0 gap-2">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={name}
            width={36}
            height={36}
            className="rounded-full object-contain"
          />
        ) : (
          <div className="h-9 w-9 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs font-medium">{ticker}</span>
          </div>
        )}
        <div className="flex flex-col w-full min-w-0 gap-1 pl-2">
          <div className="flex flex-1 justify-between min-w-0">
            <span className="text-sm truncate min-w-0">{description}</span>
            <span className="text-sm font-medium flex-shrink-0 pl-2 whitespace-nowrap">{amount}</span>
          </div>
          <div className="flex flex-1 justify-between min-w-0 items-end">
            <div className="flex gap-1">
              <Badge variant="outline" className="rounded-full capitalize">
                {type}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                {ticker}
              </Badge>
            </div>
            <span className="text-xs flex-shrink-0 pl-2 whitespace-nowrap">
              {currencyCode !== 'VND' && `${quantity}`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TransactionSkeleton() {
  return (
    <Card className="gap-1 py-0 border-none bg-background shadow-none">
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