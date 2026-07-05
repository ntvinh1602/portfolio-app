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
    title: "No data",
    description: "Unable to find any items.",
    icon: FileExclamationPoint,
  },
  error: {
    title: "Unexpected error",
    description: "Something wrong when loading data.",
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

interface StatusLabelProps {
  type: StatusType
  title?: string
  description?: string
  className?: string
}

export default function StatusLabel({
  type,
  title,
  description,
  className
}: StatusLabelProps) {
  const {
    title: defaultTitle,
    description: defaultDescription,
    icon: Icon,
  } = statusConfig[type]

  return (
    <Empty className={cn(className)}>
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className={cn(type == "error" && "bg-destructive/10")}
        >
          <Icon />
        </EmptyMedia>

        <EmptyTitle>{title ?? defaultTitle}</EmptyTitle>

        <EmptyDescription className="first-letter:uppercase lowercase">
          {description ?? defaultDescription}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
