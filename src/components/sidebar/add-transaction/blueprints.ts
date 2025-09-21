import { FieldConfig } from "@/components/form/field-types"
import { Enums, Constants } from "@/types/database.types"
import { useAccountData } from "@/hooks/useAccountData"
import { formatNum } from "@/lib/utils"

export function useBlueprintMap() {
  const { assets, debts } = useAccountData()

  const txnTypes = Constants.public.Enums.transaction_type
    .map((type) => ({
      value: type,
      label: type.replace(/\b\w/g, (c) => c.toUpperCase()),
    }))

  const cashAssets = assets
    .filter((asset) => ["cash"].includes(asset.asset_class))
    .map((asset) => ({ value: asset.id,
      label: asset.ticker }))

  const tradableAssets = assets
    .filter((asset) => ["stock", "crypto"].includes(asset.asset_class))
    .map((asset) => ({
      value: asset.id,
      label: `${asset.ticker} - ${asset.name}`,
    }))

  const stockAssets = assets
    .filter((asset) => ["stock"].includes(asset.asset_class))
    .map((asset) => ({
      value: asset.id,
      label: `${asset.ticker} - ${asset.name}`,
    }))

  const debtAssets = debts.map((debt) => ({
    value: debt.id,
    label: `${debt.lender_name} - ${formatNum(debt.principal_amount)}`,
  }))

  // blueprints
  const trade: FieldConfig<string>[] = [
    {
      name: "transaction_type",
      type: "select",
      label: "Type",
      options: txnTypes
    },
    {
      name: "transaction_date",
      type: "datepicker",
      label: "Trade Date"
    },
    {
      name: "cash_asset_id",
      type: "select",
      label: "Cash",
      options: cashAssets
    },
    {
      name: "asset",
      type: "combobox",
      label: "Asset",
      options: tradableAssets
    },
    {
      name: "quantity",
      type: "input",
      label: "Quantity",
      inputMode: "number",
      parser: (v) => parseFloat(v || "0")
    },
    {
      name: "price",
      type: "input",
      label: "Price",
      inputMode: "number",
      parser: (v) => parseFloat(v || "0")
    },
  ]

  const split: FieldConfig<string>[] = [
    {
      name: "transaction_type",
      type: "select",
      label: "Type",
      options: txnTypes
    },
    {
      name: "transaction_date",
      type: "datepicker",
      label: "Split Date"
    },
    {
      name: "asset",
      type: "combobox",
      label: "Stock",
      options: stockAssets
    },
    {
      name: "split_quantity",
      type: "input",
      label: "Quantity",
      inputMode: "number",
      parser: (v) => parseFloat(v || "0")
    },
  ]

  const cashFlow: FieldConfig<string>[] = [
    {
      name: "transaction_type",
      type: "select",
      label: "Type",
      options: txnTypes
    },
    {
      name: "transaction_date",
      type: "datepicker",
      label: "Date" 
  },
    {
      name: "asset",
      type: "select",
      label: "Account",
      options: cashAssets
    },
    {
      name: "quantity",
      type: "input",
      label: "Quantity",
      inputMode: "number",
      parser: (v) => parseFloat(v || "0")
    },
    {
      name: "description",
      type: "input",
      label: "Description"
    },
  ]

  const borrow: FieldConfig<string>[] = [
    {
      name: "transaction_type",
      type: "select",
      label: "Type",
      options: txnTypes
    },
    {
      name: "transaction_date",
      type: "datepicker",
      label: "Date"
    },
    {
      name: "cash_asset_id",
      type: "select",
      label: "Cash Account",
      options: cashAssets
    },
    {
      name: "lender",
      type: "input",
      label: "Lender",
      inputMode: "text"
    },
    {
      name: "principal",
      type: "input",
      label: "Principal",
      inputMode: "number",
      parser: (v) => parseFloat(v || "0")
    },
    {
      name: "interest_rate",
      type: "input",
      label: "Interest Rate",
      inputMode: "number",
      parser: (v) => parseFloat(v || "0")
    },
  ]

  const repay: FieldConfig<string>[] = [
    {
      name: "transaction_type",
      type: "select",
      label: "Type",
      options: txnTypes
    },
    {
      name: "transaction_date",
      type: "datepicker",
      label: "Date"
    },
    {
      name: "debt",
      type: "select",
      label: "Debt",
      options: debtAssets
    },
    {
      name: "cash_asset_id",
      type: "select",
      label: "Cash Account",
      options: cashAssets
    },
    {
      name: "principal_payment",
      type: "input",
      label: "Paid Principal",
      inputMode: "number",
      parser: (v) => parseFloat(v || "0")
    },
    {
      name: "interest_payment",
      type: "input",
      label: "Paid Interest",
      inputMode: "number",
      parser: (v) => parseFloat(v || "0")
    },
  ]

  // ✅ blueprint map now properly typed
  const blueprintMap: Record<Enums<"transaction_type">, FieldConfig<string>[]> = {
    buy: trade,
    sell: trade,
    deposit: cashFlow,
    withdraw: cashFlow,
    income: cashFlow,
    expense: cashFlow,
    split,
    borrow,
    repay,
  }

  return blueprintMap
}
