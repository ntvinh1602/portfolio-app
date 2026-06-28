import {
  CardHeader,
  CardTitle,
  CardAction,
  CardDescription,
} from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"

interface StatProps {
  stat: number
  formatted: string
  description: string
}

function Stat({ stat, formatted, description }: StatProps) {
  return (
    <Item size="xs">
      <ItemContent className="items-end">
        <ItemTitle>
          {stat < 0 ? (
            <TrendingDown className="text-destructive size-4" />
          ) : (
            <TrendingUp className="text-primary size-4" />
          )}
          {formatted}
        </ItemTitle>
        <ItemDescription className="text-xs whitespace-nowrap">
          {description}
        </ItemDescription>
      </ItemContent>
    </Item>
  )
}

export interface ChartHeaderProps {
  title: string
  titleLegend?: string
  heroStat: string
  stat1: number
  formattedStat1: string
  descriptionStat1: string
  stat2: number
  formattedStat2: string
  descriptionStat2: string
}

export function ChartCardHeader({
  title,
  titleLegend,
  heroStat,
  stat1,
  formattedStat1,
  descriptionStat1,
  stat2,
  formattedStat2,
  descriptionStat2,
}: ChartHeaderProps) {
  return (
    <CardHeader>
      <CardDescription>{title}</CardDescription>
      <CardTitle className="text-xl sm:text-2xl flex gap-1 items-baseline">
        {heroStat}
        <span className="text-sm text-muted-foreground">
          {titleLegend}
        </span>
      </CardTitle>
      <CardAction>
        <ItemGroup className="flex-row rounded-2xl bg-muted/50">
          <Stat
            stat={stat1}
            formatted={formattedStat1}
            description={descriptionStat1}
          />
          <ItemSeparator orientation="vertical" />
          <Stat
            stat={stat2}
            formatted={formattedStat2}
            description={descriptionStat2}
          />
        </ItemGroup>
      </CardAction>
    </CardHeader>
  )
}
