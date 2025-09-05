import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"
import { BalanceSheetData } from "@/types/dashboard-data"
import { BalanceSheet } from "@/components/cards/balance-sheet"
import { ArrowRight } from "lucide-react"

interface BSSheetProps {
  side: "right" | "bottom"
  data: BalanceSheetData | null
}

export function BSSheet({ side, data }: BSSheetProps) {

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-0 text-muted-foreground font-light"
        >
          Balance Sheet
          <ArrowRight />
        </Button>
      </SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle className="font-light text-xl">
            Balance Sheet
          </SheetTitle>
          <SheetDescription className="font-light">
            Summary of fund assets by its origins and allocation
          </SheetDescription>
        </SheetHeader>                  
        <BalanceSheet title={false} data={data}/>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
