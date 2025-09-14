import { mutate } from "swr"

export async function revalidateAndMutate() {
  await fetch("/api/revalidate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-secret-token": process.env.NEXT_PUBLIC_REVALIDATION_TOKEN!,
      "x-table-name": "transaction_legs",
    },
  })

  await mutate("/api/gateway/transaction-form")
}
