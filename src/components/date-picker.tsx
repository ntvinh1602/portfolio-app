"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Root,
  Content,
  Trigger,
} from "@/components/ui/popover"
import { ChevronRight, Calendar1 } from "lucide-react"
import { Calendar } from "./ui/calendar"

type DateRangeProps = {
  dateFrom: Date | undefined
  dateTo: Date | undefined
  onDateFromChange: (date: Date | undefined) => void
  onDateToChange: (date: Date | undefined) => void
}

function DateRange({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: DateRangeProps) {
  const [openFrom, setOpenFrom] = useState(false)
  const [openTo, setOpenTo] = useState(false)

  return (
    <div className="flex items-center">
      <Calendar1 className="stroke-1 size-4 h-9 border-b" />
      <Root open={openFrom} onOpenChange={setOpenFrom}>
        <Trigger asChild>
          <Button variant="outline" className="flex-1 px-3" id="dates">
            {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Select date"}
          </Button>
        </Trigger>
        <Content
          className="bg-card/25 backdrop-blur-sm w-auto overflow-hidden p-0"
          align="start"
        >
          <Calendar
            mode="single"
            captionLayout="dropdown"
            weekStartsOn={1}
            selected={dateFrom}
            defaultMonth={dateFrom}
            onSelect={(date) => {
              onDateFromChange(date)
              setOpenFrom(false)
            }}
          />
        </Content>
      </Root>
      <ChevronRight className="stroke-1 size-4 h-9 border-b" />
      <Root open={openTo} onOpenChange={setOpenTo}>
        <Trigger asChild>
          <Button variant="outline" className="flex-1 px-3" id="dates">
            {dateTo ? format(dateTo, "dd/MM/yyyy") : "Select date"}
          </Button>
        </Trigger>
        <Content
          className="bg-card/25 backdrop-blur-sm w-auto overflow-hidden p-0"
          align="start"
        >
          <Calendar
            mode="single"
            captionLayout="dropdown"
            weekStartsOn={1}
            selected={dateTo}
            defaultMonth={dateTo}
            onSelect={(date) => {
              onDateToChange(date)
              setOpenTo(false)
            }}
          />
        </Content>
      </Root>
    </div>
  )
}

function SingleDate({
  selected,
  onSelect,
  dateFormat = "dd/MM/yyyy"
}: {
  selected: Date | undefined
  onSelect: (date: Date | undefined) => void
  dateFormat?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center">
      <Calendar1 className="stroke-1 size-4 h-9 border-b" />
      <Root open={open} onOpenChange={setOpen}>
        <Trigger asChild>
          <Button variant="outline" className="flex-1 px-2" id="dates">
            {selected ? format(selected, dateFormat) : "Select date"}
          </Button>
        </Trigger>
        <Content
          className="bg-card/25 backdrop-blur-sm w-auto overflow-hidden p-0"
          align="start"
        >
          <Calendar
            mode="single"
            captionLayout="dropdown"
            startMonth={new Date(2021, 1)}
            weekStartsOn={1}
            selected={selected}
            defaultMonth={selected}
            disabled={{
              before: new Date(2021, 11, 1),
            }}
            onSelect={(date) => {
              onSelect(date)
              setOpen(false)
            }}
          />
        </Content>
      </Root>
    </div>
  )
}

export { DateRange, SingleDate }