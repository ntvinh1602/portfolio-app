import { FieldConfig } from "@/components/form/field-types"
import { Constants } from "@/types/database.types"

const assetClass = Constants.public.Enums.asset_class
  .filter((type) => !["equity","liability"].includes(type))
  .map((type) => ({ 
    value: type,
    label: type.replace(/\b\w/g, (c) => c.toUpperCase())
  }))

export const assetBlueprint: FieldConfig[] = [
  {
    name: "ticker",
    type: "input",
    label: "Ticker",
    transform: (val) => val.toUpperCase(),
  },
  {
    name: "asset_class",
    type: "select",
    label: "Asset Class",
    options: assetClass,
    placeholder: "Select asset class"
  },
  {
    name: "name",
    type: "input",
    label: "Name",
  },
  {
    name: "currency_code",  
    type: "input",
    label: "Currency",
    transform: (val) => val.toUpperCase(),
  },
  {
    name: "logo_url",
    type: "input",
    label: "Logo URL",
    inputMode: "url",
  },
  {
    name: "is_active",
    type: "checkbox",
    label: "Fetching",
  },
]