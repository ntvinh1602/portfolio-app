import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemSeparator,
} from "../ui/item"

interface Props {
  showMetricsSection?: boolean
}

export default function ChartCardSkeleton({
  showMetricsSection = true,
}: Props) {
  return (
    <Card className="w-full">
      <CardHeader>
        <Skeleton className="h-4 w-16 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md sm:h-9 sm:w-36" />

        {showMetricsSection !== false && (
          <CardAction>
            <ItemGroup className="flex-row rounded-2xl bg-muted/50">
              <Item size="xs">
                <ItemContent className="items-end">
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <Skeleton className="h-4 w-12 rounded-md" />
                </ItemContent>
              </Item>
              <ItemSeparator orientation="vertical" />
              <Item size="xs">
                <ItemContent className="items-end">
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <Skeleton className="h-4 w-12 rounded-md" />
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
