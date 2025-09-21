import { ZodError } from "zod"
import { PostgrestError } from "@supabase/supabase-js"

export type NormalizedError = {
  title: string
  messages: string[]
}

export function NormalizeError(err: unknown): NormalizedError {
  if (err instanceof ZodError) {
    return {
      title: "Invalid form input",
      messages: err.issues.map((i) => i.message),
    }
  }

  if (typeof err === "object" && err !== null && "message" in err) {
    const supaErr = err as PostgrestError
    return {
      title: "Supabase error",
      messages: [supaErr.message || "An unknown database error occurred."],
    }
  }

  if (err instanceof Error) {
    return {
      title: "Unexpected error",
      messages: [err.message],
    }
  }

  return {
    title: "Unexpected error",
    messages: ["An unknown error occurred."],
  }
}