import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from "@/components/ui/item"
import { useIsMobile } from "@/hooks/use-mobile"
import Image from "next/image"
import { formatNum, compactNum } from "@/lib/utils"

interface Props {
  variant: "bs" | "dashboard" | "performance"
  ticker: string
  name: string
  logo_url: string | null
  total_value: number
  asset_class?: string
  currency_code?: string
  quantity?: number
  mkt_price?: number | null
  net_profit?: number | null
}

export default function AssetItem({
  variant,
  ticker,
  name,
  asset_class,
  currency_code,
  logo_url,
  quantity,
  total_value,
  mkt_price,
  net_profit,
}: Props) {
  const isMobile = useIsMobile()
  const pct_profit = formatNum(((net_profit || 0) / total_value) * 100, 1)
  const compact_profit = compactNum(net_profit || 0)
  const color = (net_profit || 0) >= 0 ? "text-primary" : "text-destructive"
  const unit = asset_class == "stock" ? " shares" : `${currency_code}`

  return (
    <Item
      className={`${variant == "bs" && "px-0 py-1"}`}
      variant={`${variant == "bs" ? "default" : "muted"}`}
    >
      <ItemMedia variant="image">
        {logo_url && (
          <Image
            src={logo_url}
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
        {ticker !== "FX.VND" && variant !== "performance" && (
          <ItemDescription className="text-xs">
            {`${formatNum(quantity || 0)} ${unit} @ ${formatNum(mkt_price || 0)}`}
          </ItemDescription>
        )}
        {variant == "performance" && (
          <ItemDescription>{ticker}</ItemDescription>
        )}
      </ItemContent>
      <ItemContent className="items-end">
        {variant !== "performance" && (
          <ItemDescription>
            {!isMobile ? formatNum(total_value) : compactNum(total_value)}
          </ItemDescription>
        )}
        {ticker !== "FX.VND" && variant !== "performance" && (
          <ItemDescription className={`${color} text-xs`}>
            {!isMobile ? `${compact_profit} (${pct_profit}%)` : pct_profit}
          </ItemDescription>
        )}
        {variant == "performance" && (
          <ItemTitle>{formatNum(total_value)}</ItemTitle>
        )}
      </ItemContent>
    </Item>
  )
}
