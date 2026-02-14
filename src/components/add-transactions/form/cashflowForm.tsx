"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldContent,
  FieldTitle
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from "@/components/ui/input-group"
import { createClient } from "@/lib/supabase/client"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Combobox } from "@/components/combobox"
import { useAccountData } from "@/hooks/useAccountData"
import { formatNumber, parseNumber } from "@/lib/utils"
import { cashflowSchema } from "../schema"

type FormValues = z.infer<typeof cashflowSchema>

export function CashflowForm() {
  const supabase = createClient()
  const { assetData, isLoading } = useAccountData()
  const [loading, setLoading] = React.useState(false)

  // Filter only stock tickers and map to unique ticker names
  const assetIDs = React.useMemo(() => {
    const seen = new Set<string>()
    return assetData
      .filter((a) => a.asset_class === "cash" || a.asset_class === "fund")
      .map((a) => ({
        value: a.id,
        label: a.name ? `${a.ticker} — ${a.name}` : a.ticker,
      }))
      .filter((item) => {
        if (seen.has(item.value)) return false
        seen.add(item.value)
        return true
      })
  }, [assetData])

  const form = useForm<FormValues>({
    resolver: zodResolver(cashflowSchema),
    defaultValues: {
      operation: "expense"
    },
  })

  async function onSubmit(data: FormValues) {
    setLoading(true)
    try {
      const { error } = await supabase.rpc("add_cashflow_event", {
        p_operation: data.operation,
        p_asset_id: data.asset,
        p_quantity: data.quantity,
        p_fx_rate: data.fx_rate ?? 1,
        p_memo: data.memo,
      })

      if (error) {
        toast.error("Transaction failed", {
          description: error.message,
        })
      } else {
        toast.success("Cashflow event added", {
          description: `${data.memo}`,
        })
        form.reset()
      }
    } catch (err) {
        const message =  err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again later."
        toast.error("Unexpected error", { description: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form id="stock-form" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>

          {/* Opearation */}
          <Controller
            name="operation"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="grid-cols-2"
                >
                  <FieldLabel htmlFor="deposit-option">
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldTitle>Deposit</FieldTitle>
                        <FieldDescription>
                          Paid-in Capital
                        </FieldDescription>
                      </FieldContent>
                      <RadioGroupItem value="deposit" id="deposit-option" />
                    </Field>
                  </FieldLabel>

                  <FieldLabel htmlFor="withdraw-option">
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldTitle>Withdraw</FieldTitle>
                        <FieldDescription>
                          Cashing out
                        </FieldDescription>
                      </FieldContent>
                      <RadioGroupItem value="withdraw" id="withdraw-option" />
                    </Field>
                  </FieldLabel>

                  <FieldLabel htmlFor="income-option">
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldTitle>Income</FieldTitle>
                        <FieldDescription>
                          Interest, dividends etc.
                        </FieldDescription>
                      </FieldContent>
                      <RadioGroupItem value="income" id="income-option" />
                    </Field>
                  </FieldLabel>

                  <FieldLabel htmlFor="expense-option">
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldTitle>Expense</FieldTitle>
                        <FieldDescription>
                          Margin, fees etc.
                        </FieldDescription>
                      </FieldContent>
                      <RadioGroupItem value="expense" id="expense-option" />
                    </Field>
                  </FieldLabel>
                </RadioGroup>

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Asset */}
          <Controller
            name="asset"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Ticker</FieldLabel>
                <Combobox
                  items={assetIDs}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={isLoading ? "Loading assets..." : "Select cash/fund asset"}
                  searchPlaceholder="Search assets..."
                  emptyPlaceholder="No assets found."
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Quantity */}
          <Controller
            name="quantity"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Quantity</FieldLabel>
                <InputGroup className="border-0">
                  <Input
                    type="text" // important: text, not number, to allow commas
                    value={formatNumber(field.value)}
                    onChange={(e) => {
                      const formatted = e.target.value;
                      const parsed = parseNumber(formatted);
                      field.onChange(parsed);
                    }}
                    inputMode="decimal"
                    placeholder="Amount in original currency"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>Units</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* FX Rate */}
          <Controller
            name="fx_rate"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>FX Rate</FieldLabel>
                <InputGroup className="border-0">
                  <Input
                    type="text" // important: text, not number, to allow commas
                    value={formatNumber(field.value)}
                    onChange={(e) => {
                      const formatted = e.target.value;
                      const parsed = parseNumber(formatted);
                      field.onChange(parsed);
                    }}
                    inputMode="decimal"
                    placeholder="FX rate (to VND)"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>VND</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Memo */}
          <Controller
            name="memo"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Ticker</FieldLabel>
                <Combobox
                  items={assetIDs}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={isLoading ? "Loading assets..." : "Select cash/fund asset"}
                  searchPlaceholder="Search assets..."
                  emptyPlaceholder="No assets found."
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>
      </form>
      <Field className="flex justify-end" orientation="horizontal">
        <Button
          type="button"
          variant="outline"
          onClick={() => form.reset()}
        >
          Reset
        </Button>
        <Button type="submit" form="stock-form" disabled={loading}>
          {loading ? "Submitting..." : "Submit"}
        </Button>
      </Field>
    </div>
  )
}
