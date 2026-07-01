import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"
import { Loader2, FileExclamationPoint, TriangleAlert } from "lucide-react"

type StatusType = "loading" | "empty" | "error"

const statusConfig = {
  loading: {
    title: "Loading",
    description: "Retrieving your data...",
    icon: (props) => <Loader2 className="animate-spin" {...props} />,
  },
  empty: {
    title: "No Data",
    description: "Unable to find any items.",
    icon: FileExclamationPoint,
  },
  error: {
    title: "Something Went Wrong",
    description: "Unable to load your data.",
    icon: (props) => <TriangleAlert className="text-destructive" {...props} />,
  },
} satisfies Record<
  StatusType,
  {
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
  }
>

export default function StatusLabel({ type }: { type: StatusType }) {
  const { title, description, icon: Icon } = statusConfig[type]

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className={cn(type == "error" && "bg-destructive/10")}
        >
          <Icon />
        </EmptyMedia>

        <EmptyTitle>{title}</EmptyTitle>

        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
