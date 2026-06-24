"use client"

import Image from "next/image"
import { formatNum } from "@/lib/utils"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"

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
    <Item variant="muted">
      <ItemMedia variant="image">
        <Image
          src={logoUrl}
          alt={name}
          width={44}
          height={44}
          unoptimized
          loading="eager"
        />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle>{ticker}</ItemTitle>
        <ItemDescription className="truncate">{name}</ItemDescription>
      </ItemContent>
      <ItemContent>
        <ItemTitle>{formatNum(totalAmount)}</ItemTitle>
      </ItemContent>
    </Item>
  )
}
