"use client"

import * as React from "react"
import { Control, Controller, FieldValues, Path } from "react-hook-form"
import { format, parseISO } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { CalendarIcon, ClockIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type DateTimeFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: Path<T>
  label: string
}

function formatLocalDateTime(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0")

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`
}

function formatDisplay(dateString?: string) {
  if (!dateString) return "Select date & time"

  const date = parseISO(dateString)

  return format(date, "dd-MMM-yyyy HH:mm")
}

export function DateTimeField<T extends FieldValues>({
  control,
  name,
  label,
}: DateTimeFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const value = field.value ? new Date(field.value) : undefined
        const [time, setTime] = React.useState(
          value
            ? value.toTimeString().slice(0, 8)
            : "10:30:00"
        )

        function handleDateChange(date?: Date) {
          if (!date) {
            field.onChange("")
            return
          }

          const [h, m, s] = time.split(":").map(Number)

          const updated = new Date(date)
          updated.setHours(h, m, s)

          field.onChange(formatLocalDateTime(updated))
        }

        function handleTimeChange(
          e: React.ChangeEvent<HTMLInputElement>
        ) {
          const newTime = e.target.value
          setTime(newTime)

          if (!value) return

          const [h, m, s] = newTime.split(":").map(Number)

          const updated = new Date(value)
          updated.setHours(h, m, s)

          field.onChange(formatLocalDateTime(updated))
        }

        return (
          <Field>
            <FieldLabel>{label}</FieldLabel>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDisplay(field.value)}
                </Button>
              </PopoverTrigger>

              <PopoverContent
                className="bg-card/25 backdrop-blur-sm w-auto overflow-hidden p-0"
                align="center"
              >
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  weekStartsOn={1}
                  defaultMonth={value}
                  selected={value}
                  onSelect={handleDateChange}
                />

                <div className="flex items-center gap-2 px-4 pb-2">
                  <ClockIcon className="stroke-1" />
                  <Input
                    type="time"
                    step="1"
                    value={time}
                    onChange={handleTimeChange}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </Field>
        )
      }}
    />
  )
}