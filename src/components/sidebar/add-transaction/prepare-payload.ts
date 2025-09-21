import { FieldConfig } from "@/components/form/field-types";
import { z } from "zod";
import { txnSchema } from "./schema";

type TransactionPayload = z.infer<typeof txnSchema>;

export function preparePayload(
  formState: Record<string, string | undefined>,
  blueprint: FieldConfig[],
  transactionType: string
) {
  const payload: Record<string, unknown> = { transaction_type: transactionType };

  for (const f of blueprint) {
    const raw = formState[f.name];
    payload[f.name] = f.parser ? f.parser(raw) : raw || undefined;
  }

  return payload as TransactionPayload;
}