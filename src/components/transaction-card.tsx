import {
  Card,
  CardContent,
  CardTitle,
} from "@/components/ui/card"
import Image from 'next/image'
import { Badge } from "@/components/ui/badge"

export function TransactionCard() {
  return (
    <Card className="gap-1 py-0 border-none bg-background shadow-none">
      <CardTitle className="text-sm font-normal">
        24 June 2025
      </CardTitle>
      <CardContent className="flex items-center border-t py-2 px-0 gap-2">
        <Image
          src="https://s3-symbol-logo.tradingview.com/crypto/XTVCBTC--big.svg"
          alt="Company Logo"
          width={36}
          height={36}
          className="rounded-full object-contain"
        />
        <div className="flex flex-col w-full min-w-0 gap-1">
          <div className="flex flex-1 justify-between min-w-0">
            <span className="text-sm truncate min-w-0">Loan from Capybara at 10% p.a</span>
            <span className="text-sm font-medium flex-shrink-0 pl-2 whitespace-nowrap">1,234,567,890</span>
          </div>
          <div className="flex flex-1 justify-between min-w-0 items-end">
            <div className="flex gap-1">
              <Badge variant="outline" className="rounded-full">
                Deposit
              </Badge>
              <Badge variant="outline" className="rounded-full">
                Cash
              </Badge>
            </div>
            <span className="text-xs flex-shrink-0 pl-2 whitespace-nowrap">1,234.03 MYR</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}