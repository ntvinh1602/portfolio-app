import { Leaf, BriefcaseBusiness } from "lucide-react"
import { LabelConfig } from "@/types/global.types"

/* --- LABEL CONFIG --- */
export const seatType: LabelConfig[] = [
  { value: "eco", label: "Economy", icon: Leaf },
  { value: "biz", label: "Business", icon: BriefcaseBusiness },
]
