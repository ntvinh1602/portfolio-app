import {
  Card,
  CardContent,
  CardAction,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { ArrowLeftRight } from "lucide-react"
import { Item, ItemContent, ItemGroup, ItemTitle } from "@/components/ui/item"

interface CashflowProps {
  name: string
  net: string
  inflow: string
  outflow: string
}

export function Cashflow({ name, net, inflow, outflow }: CashflowProps) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{name}</CardDescription>
        <CardTitle className="text-base sm:text-xl">{net}</CardTitle>
        <CardAction>
          <ArrowLeftRight className="stroke-1" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <ItemGroup className="bg-muted/50 rounded-2xl p-2">
          <Item size="xs">
            <ItemContent>
              <ItemTitle>Deposit</ItemTitle>
            </ItemContent>
            <ItemContent>
              <ItemTitle>{inflow}</ItemTitle>
            </ItemContent>
          </Item>
          <Item size="xs">
            <ItemContent>
              <ItemTitle>Withdraw</ItemTitle>
            </ItemContent>
            <ItemContent>
              <ItemTitle>{outflow}</ItemTitle>
            </ItemContent>
          </Item>
        </ItemGroup>
      </CardContent>
    </Card>
  )
}
