import { LoginForm } from "@/components/forms/login"

export default function LoginPage() {
  return (
    <div className="grid min-h-svh">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex justify-center gap-2">
          <a href="#" className="flex items-center gap-2 font-medium">
            Portfolio Tracker
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  )
}
