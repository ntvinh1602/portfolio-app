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
import { ArrowUpRight } from "lucide-react"

interface BSSheetProps {
  side: "right" | "bottom"
  data: BalanceSheetData | null
}

export function BSSheet({ side, data }: BSSheetProps) {

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-thin gap-0.5 [&_svg]:stroke-1"
        >
          B. Sheet
          <ArrowUpRight />
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
