import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { TrendingUp, TrendingDown } from "lucide-react"


type TwoMetricProps = {
  title: string | false
  label1: string
  value1: string
  label2: string
  value2: string
  icon?: boolean
}

export function TwoMetric({title, label1, value1, label2, value2, icon=true}: TwoMetricProps) {
  return (
    <div className="flex flex-col w-full gap-1">
      {title &&
        <h2 className="px-3 text-sm text-muted-foreground">
          {title}
        </h2>
      }
      <Card className="bg-muted/50 shadow-none">
        <CardHeader className="flex justify-between px-2">
          <div className="flex flex-col w-full items-center">
            <CardDescription>{label1}</CardDescription>
            <CardTitle className="flex text-xl gap-1 items-center">
              <>
                {value1}
                {icon && (
                  parseFloat(value1) > 0
                    ? <TrendingUp className="text-green-700 dark:text-green-400"/>
                    : <TrendingDown className="text-red-700 dark:text-red-400"/>
                )}
              </>
            </CardTitle>
          </div>
          <div className="h-12">
            <Separator orientation="vertical" />
          </div>
          <div className="flex flex-col w-full items-center">
            <CardDescription>{label2}</CardDescription>
            <CardTitle className="flex text-xl gap-1 items-center">
              <>
                {value2}
                {icon && (
                  parseFloat(value2) > 0
                    ? <TrendingUp className="text-green-700 dark:text-green-400"/>
                    : <TrendingDown className="text-red-700 dark:text-red-400"/>
                )}
              </>
            </CardTitle>
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}

