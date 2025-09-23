import { isTradingHours } from "@/lib/utils"

export function LiveIndicator({
  source,
  is247,
}: {
  source: boolean
  is247: boolean
}) {
  let status: "realtime" | "delayed" | "closed"

  if (is247) {
    status = source ? "realtime" : "delayed"
  } else {
    if (!isTradingHours()) {
      status = "closed"
    } else {
      status = source ? "realtime" : "delayed"
    }
  }

  return (
    <div className="mx-2 text-xs text-muted-foreground">
      {status === "realtime" && (
        <div className="flex items-center gap-1">
          <div className="relative flex size-2">
            <div className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-500 opacity-75"/>
            <div className="relative inline-flex size-2 rounded-full bg-lime-600"/>
          </div>
          <span>Live</span>
        </div>
      )}
      {status === "delayed" && (
        <div className="flex items-center gap-1">
          <div className="size-2 rounded-full bg-rose-700"/>
          <span>Delayed</span>
        </div>
      )}
      {status === "closed" && (
        <div className="flex items-center gap-1">
          <div className="size-2 rounded-full bg-gray-500"/>
          <span>Closed</span>
        </div>
      )}
    </div>
  )
}
