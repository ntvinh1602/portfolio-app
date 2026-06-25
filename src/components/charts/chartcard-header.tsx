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
  ItemTitle,
} from "@/components/ui/item"

interface Props {
  title: string
  descriptionTitle?: string
  heroStat: string
  stat1: number
  formattedStat1: string
  descriptionStat1: string
  stat2: number
  formattedStat2: string
  descriptionStat2: string
}

export default function ChartCardHeader({
  title,
  descriptionTitle,
  heroStat,
  stat1,
  formattedStat1,
  descriptionStat1,
  stat2,
  formattedStat2,
  descriptionStat2,
}: Props) {
  return (
    <CardHeader>
      <CardDescription>{title}</CardDescription>
      <CardTitle className="text-xl sm:text-2xl flex gap-1 items-baseline">
        {heroStat}
        <span className="text-sm text-muted-foreground">
          {descriptionTitle}
        </span>
      </CardTitle>
      <CardAction>
        <ItemGroup className="grid grid-cols-2 rounded-2xl bg-muted/50">
          <Item size="xs">
            <ItemContent className="items-end">
              <ItemTitle>
                {stat1 < 0 ? (
                  <TrendingDown className="text-destructive size-4" />
                ) : (
                  <TrendingUp className="text-primary size-4" />
                )}
                {formattedStat1}
              </ItemTitle>
              <ItemDescription className="text-xs">
                {descriptionStat1}
              </ItemDescription>
            </ItemContent>
          </Item>
          <Item size="xs">
            <ItemContent className="items-end">
              <ItemTitle>
                {stat2 < 0 ? (
                  <TrendingDown className="text-destructive size-4" />
                ) : (
                  <TrendingUp className="text-primary size-4" />
                )}
                {formattedStat2}
              </ItemTitle>
              <ItemDescription className="text-xs">
                {descriptionStat2}
              </ItemDescription>
            </ItemContent>
          </Item>
        </ItemGroup>
      </CardAction>
    </CardHeader>
  )
}
