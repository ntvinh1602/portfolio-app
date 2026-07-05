import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from "@/components/ui/item"
import Image from "next/image"
import { formatNum, compactNum, pctNum, cn } from "@/lib/utils"

interface AssetItemProps {
  ticker: string
  name: string
  logo_url: string | null
  total_value: number
}

interface AssetItemBSProps extends AssetItemProps {
  variant?: "bs" | "dashboard"
  asset_class: string
  currency_code: string
  quantity: number
  mkt_price: number
  net_profit: number
}

export function AssetItemBS({
  variant = "bs",
  ticker,
  name,
  asset_class,
  currency_code,
  logo_url,
  quantity,
  total_value,
  mkt_price,
  net_profit,
}: AssetItemBSProps) {
  const color = net_profit >= 0 ? "text-primary" : "text-destructive"
  const unit = asset_class == "stock" ? " shares" : `${currency_code}`
  const background = variant == "bs" ? "default" : "muted"

  return (
    <Item className={cn(variant == "bs" && "px-0 py-1")} variant={background}>
      <ItemMedia variant="image">
        {logo_url && (
          <Image
            src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/logo/stock/${logo_url}`}
            alt={name}
            width={44}
            height={44}
            unoptimized
            loading="eager"
          />
        )}
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{name}</ItemTitle>
        {ticker !== "FX.VND" && (
          <ItemDescription className="text-xs">
            {`${formatNum(quantity)} ${unit} @ ${formatNum(mkt_price)}`}
          </ItemDescription>
        )}
      </ItemContent>
      <ItemContent className="items-end">
        <ItemDescription>
          {formatNum(Math.max(total_value, 0))}
        </ItemDescription>
        {ticker !== "FX.VND" && (
          <ItemDescription className={cn(color, "text-xs")}>
            {`${compactNum(net_profit)} (${pctNum((net_profit) / total_value)})`}
          </ItemDescription>
        )}
      </ItemContent>
    </Item>
  )
}

export function AssetItemTopStock({
  ticker,
  name,
  logo_url,
  total_value,
}: AssetItemProps) {
  return (
    <Item variant="muted">
      <ItemMedia variant="image">
        {logo_url && (
          <Image
            src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/logo/stock/${logo_url}`}
            alt={name}
            width={44}
            height={44}
            unoptimized
            loading="eager"
          />
        )}
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{name}</ItemTitle>
        <ItemDescription>{ticker}</ItemDescription>
      </ItemContent>
      <ItemContent className="items-end">
        <ItemTitle>{formatNum(Math.max(total_value, 0))}</ItemTitle>
      </ItemContent>
    </Item>
  )
}
