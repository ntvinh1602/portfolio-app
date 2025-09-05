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
import { BalanceSheet } from "@/components/cards/balance-sheet"
import { ArrowRight } from "lucide-react"

interface BSSheetProps {
  side: "right" | "bottom"
}

export function BSSheet({ side }: BSSheetProps) {

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
        <BalanceSheet title={false}/>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
