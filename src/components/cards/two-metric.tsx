import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

type TwoMetricProps = {
  title?: string | false
  title_url?: string | false
  subtitle?: string | false
  label1: string
  value1: string
  label2: string
  value2: string
  icon?: boolean
  className?: string
}

export function TwoMetric({
    title=false,
    title_url=false,
    subtitle=false,
    label1,
    value1,
    label2,
    value2,
    icon=true,
    className
  }: TwoMetricProps) {
  const router = useRouter()
  const handleNavigation = () => {
    if (title_url) {
      router.push(title_url)
    }
  }

  return (
    <Card className={cn("gap-4", className)}>
      {title && (
        <CardHeader>
          {title_url
            ? ( 
                <div
                  className="flex items-center"
                  onClick={handleNavigation}
                >
                  <CardTitle>{title}</CardTitle>
                  {title_url && <ChevronRight className="size-4"/>}
                </div>
              )
            : <CardTitle>{title}</CardTitle>
          }
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
      )}
      <CardContent className="flex">
        <div className="flex flex-col w-full items-center">
          <CardDescription>{label1}</CardDescription>
          <CardTitle className="flex text-xl gap-1 items-center">
            <>
              <span className={value1 === "Loading..." ? "animate-pulse" : ""}>
                {value1}
              </span>
              {icon && (
                parseFloat(value1) > 0
                  ? <TrendingUp className="text-green-700 dark:text-green-400"/>
                  : <TrendingDown className="text-red-700 dark:text-red-400"/>
              )}
            </>
          </CardTitle>
        </div>
        <div className="h-12 px-6">
          <Separator orientation="vertical" className="bg-muted-foreground/25"/>
        </div>
        <div className="flex flex-col w-full items-center">
          <CardDescription>{label2}</CardDescription>
          <CardTitle className="flex text-xl gap-1 items-center">
            <>
              <span className={value2 === "Loading..." ? "animate-pulse" : ""}>
                {value2}
              </span>
              {icon && (
                parseFloat(value2) > 0
                  ? <TrendingUp className="text-green-700 dark:text-green-400"/>
                  : <TrendingDown className="text-red-700 dark:text-red-400"/>
              )}
            </>
          </CardTitle>
        </div>
      </CardContent>
    </Card>
  )
}

