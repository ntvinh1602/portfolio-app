import Image from 'next/image'
import { TrendingUp, TrendingDown } from "lucide-react"
import { formatNum } from "@/lib/utils"
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item"

export function Asset({
  ticker,
  name,
  logoUrl,
  totalAmount,
}: {
  ticker: string
  name: string
  logoUrl: string
  totalAmount: number
}) {

  return (
    <Item variant="muted" size="xs">
      <ItemMedia>
        <Image
          src={logoUrl}
          alt={name}
          width={44}
          height={44}
          className="rounded-2xl bg-background"
        />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle>{ticker}</ItemTitle>
        <ItemDescription className="truncate">{name}</ItemDescription>
      </ItemContent>
      <ItemContent>
        <ItemTitle>
          {totalAmount !== null && totalAmount < 0
            ? <TrendingDown className="text-destructive size-4" />
            : <TrendingUp className="text-primary size-4" />
          }
          {formatNum(totalAmount)}
        </ItemTitle>
      </ItemContent>
    </Item>
  )
}