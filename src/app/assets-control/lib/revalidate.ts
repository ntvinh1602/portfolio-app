import { mutate } from "swr"

export async function refreshData() {
  await fetch("/api/revalidate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-secret-token": process.env.NEXT_PUBLIC_REVALIDATION_TOKEN!,
      "x-tags": "account",
    },
  })

  await mutate("/api/gateway/account-data")
}
