import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <div className="grid min-h-svh items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  )
}
