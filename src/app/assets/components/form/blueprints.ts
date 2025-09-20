import { FieldConfig } from "@/components/form/field-types"
import { Constants } from "@/types/database.types"
import { useAccountData } from "@/hooks/useAccountData"
import { formatNum } from "@/lib/utils"

export function useBlueprintMap() {
  const { assets } = useAccountData()

  const assetClass = Constants.public.Enums.asset_class
    .filter((type) => !["equity","liability"].includes(type))
    .map((type) => ({ 
      value: type,
      label: type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    }))

  const cashAssets = assets
    .filter((asset) => ["cash"].includes(asset.asset_class))
    .map((asset) => ({ value: asset.id, label: asset.ticker }))

  const tradableAssets = assets
    .filter((asset) => ["stock","crypto"].includes(asset.asset_class))
    .map((asset) => ({
      value: asset.id,
      label: `${asset.ticker} - ${asset.name}`
    }))

  const stockAssets = assets
    .filter((asset) => ["stock"].includes(asset.asset_class))
    .map((asset) => ({
      value: asset.id,
      label: `${asset.ticker} - ${asset.name}`
    }))


  const assetBlueprint: FieldConfig[] = [
    {
      name: "ticker",
      type: "input",
      label: "Ticker",
    },
    {
      name: "asset_class",
      type: "select",
      label: "Asset Class",
      options: assetClass
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
    },
    {
      name: "logo_url",
      type: "input",
      label: "Quantity",
      inputMode: "url",
    },
    {
      name: "is_active",
      type: "input",
      label: "Fetching",
      inputMode: "checkbox",
    },
  ]

  return assetBlueprint
}