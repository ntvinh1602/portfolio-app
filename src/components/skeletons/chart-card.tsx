import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
} from "../ui/item"

interface SimpleProps {
  name: string
  children: React.ReactNode
}

interface FullProps extends SimpleProps {
  stat1: string
  stat2: string
}

export function FullChartSkeleton({ name, stat1, stat2, children }: FullProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardDescription>{name}</CardDescription>
        <Skeleton className="h-8 w-28 rounded-md sm:h-9 sm:w-36" />
        <CardAction>
          <ItemGroup className="flex-row rounded-2xl bg-muted/50">
            <Item size="xs">
              <ItemContent className="items-end">
                <Skeleton className="h-4 w-16 rounded-md" />
                <ItemDescription className="text-xs whitespace-nowrap">{stat1}</ItemDescription>
              </ItemContent>
            </Item>
            <ItemSeparator orientation="vertical" />
            <Item size="xs">
              <ItemContent className="items-end">
                <Skeleton className="h-4 w-16 rounded-md" />
                <ItemDescription className="text-xs whitespace-nowrap">{stat2}</ItemDescription>
              </ItemContent>
            </Item>
          </ItemGroup>
        </CardAction>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function SimpleChartSkeleton({ name, children }: SimpleProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardDescription>{name}</CardDescription>
        <Skeleton className="h-8 w-28 rounded-md sm:h-9 sm:w-36" />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
