import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import Image from 'next/image'
import {
  ArrowBigUp,
} from "lucide-react"

interface StockCardProps {
  ticker: string;
  name: string;
  logoUrl: string;
  totalAmount: string;
  pnl: string;
}

export function StockCard({ ticker, name, logoUrl, totalAmount, pnl }: StockCardProps) {
  return (
    <Card className="rounded-full py-4 shadow-none">
      <CardContent className="flex items-center gap-4 px-4">
        <Image
          src={logoUrl}
          alt="Company Logo"
          width={56}
          height={56}
          className="rounded-full object-contain"
        />
        <div className="flex justify-between w-full items-center">
          <div className="flex flex-col gap-2">
            <CardTitle>{ticker}</CardTitle>
            <CardDescription>{name}</CardDescription>
          </div>
          <div className="flex flex-col gap-2 justify-end px-4">
            <CardTitle className="text-right">
              {totalAmount}
            </CardTitle>
            <CardDescription className="flex items-center justify-end">
              <ArrowBigUp className="size-5"/>{pnl}
            </CardDescription>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}