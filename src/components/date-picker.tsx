"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"

type DatePickerProps = (
  | {
      mode: "single"
      selected: Date | undefined
      onSelect: (date: Date | undefined) => void
    }
  | {
      mode: "range"
      selected: DateRange | undefined
      onSelect: (range: DateRange | undefined) => void
    }
)

export default function DatePicker(props: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const buttonText = React.useMemo(() => {
    if (props.mode === "range") {
      const { selected } = props
      if (selected?.from && selected?.to) {
        return `${format(selected.from, "dd/MM/yy")} - ${format(
          selected.to,
          "dd/MM/yy",
        )}`
      }
      return "Filter by date..."
    }

    if (props.mode === "single") {
      const { selected } = props
      if (selected) {
        return format(selected, "dd/MM/yyyy")
      }
      return "Select a date"
    }
  }, [props])

  const trigger = (
    <Button
      variant="outline"
      id="dates"
      className="w-full justify-between h-10"
    >
      <CalendarIcon className="size-4 stroke-[1]" />
      <span className="flex-1 text-left">{buttonText}</span>
      <ChevronDownIcon className="size-4" />
    </Button>
  )

  if (props.mode === "single") {
    return (
      <div className="flex flex-col gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent className="rounded-2xl bg-card/25 backdrop-blur-sm w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              captionLayout="dropdown"
              weekStartsOn={1}
              selected={props.selected}
              defaultMonth={props.selected}
              onSelect={(day) => {
                props.onSelect(day)
                setOpen(false)
              }}
            />
            <div className="p-2 text-xs">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  props.onSelect(new Date())
                  setOpen(false)
                }}
              >
                Today
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent className="rounded-2xl bg-card/25 backdrop-blur-sm w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="range"
            captionLayout="dropdown"
            weekStartsOn={1}
            defaultMonth={props.selected?.from}
            selected={props.selected}
            onSelect={props.onSelect}
          />
          <div className="p-2 text-xs">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => props.onSelect(undefined)}
            >
              Clear Selection
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
