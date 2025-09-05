import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export function Loading() {
  return (
    <Card className="gap-3 py-10 border-0">
      <CardHeader className="flex flex-col items-center">
        <Loader2 className="size-10 animate-spin" />
      </CardHeader>
      <CardContent className="flex flex-col items-center animate-pulse">
        <CardDescription className="text-foreground text-lg font-thin">
          Loading... almost there...
        </CardDescription>
      </CardContent>
    </Card>
  )
}
