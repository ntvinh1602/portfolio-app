import { FieldConfig } from "@/components/form/field-types";

export function preparePayload(
  formState: Record<string, string | undefined>,
  blueprint: FieldConfig[],
  transactionType: string
) {
  const payload: Record<string, any> = { transaction_type: transactionType };

  for (const f of blueprint) {
    const raw = formState[f.name];
    payload[f.name] = f.parser ? f.parser(raw) : raw || undefined;
  }

  return payload;
}