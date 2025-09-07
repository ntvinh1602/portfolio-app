import { Loader2 } from "lucide-react"

export function Loading() {
  return (
    <div className="w-full flex justify-center">
      <Loader2 className="size-10 stroke-1 animate-spin my-20 text-muted-foreground" />
    </div>
  )
}
