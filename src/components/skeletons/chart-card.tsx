import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
} from "../ui/item"

interface Props {
  title: string
  showMetricsSection?: boolean
  description1?: string
  description2?: string
}

export default function ChartCardSkeleton({
  title,
  showMetricsSection = true,
  description1,
  description2
}: Props) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardDescription>{title}</CardDescription>

        <CardTitle className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-md sm:h-9 sm:w-36" />
        </CardTitle>

        {showMetricsSection !== false && (
          <CardAction>
            <ItemGroup className="flex-row rounded-2xl bg-muted/50">
              <Item size="xs">
                <ItemContent className="items-end">
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <ItemDescription className="text-muted-foreground text-xs">
                    {description1}
                  </ItemDescription>
                </ItemContent>
              </Item>
              <ItemSeparator orientation="vertical" />
              <Item size="xs">
                <ItemContent className="items-end">
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <ItemDescription className="text-muted-foreground text-xs">
                    {description2}
                  </ItemDescription>
                </ItemContent>
              </Item>
            </ItemGroup>
          </CardAction>
        )}
      </CardHeader>

      <CardContent>
        <Skeleton className="aspect-[16/9] w-full rounded-3xl" />
      </CardContent>
    </Card>
  )
}
