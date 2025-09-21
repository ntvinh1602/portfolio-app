import { NormalizedError } from "@/lib/error"
import { toast } from "sonner"

export function showErrorToast(error: NormalizedError) {
  toast.error(
    <div className="flex flex-col gap-1">
      <p className="font-semibold">{error.title}</p>
      {error.messages.length > 1 ? (
        <ul className="list-disc list-inside">
          {error.messages.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      ) : (
        <p>{error.messages[0]}</p>
      )}
    </div>
  )
}
